var win = this;

var JP = function (tagName, options) {
    this.tagName = tagName;
    this.options = options;
    this.options.root = this.options.root ? this.options.root : ''
    this.jp = this;

    this.data = this.options.data && this.options.data();
    var component = this.options.filename || "index.html";
    this.supportsImports = function () {
        return 'import' in document.createElement('link');
    }
    this.handleError = function (e) {
        console.error(e.message);
    }
    this.init = function (cb) {
        if (this.supportsImports()) {
            this.loadLink(cb);
            // Good to go!
        } else {
            // Use other libraries/require systems to load files.
            console.error('当前浏览器不支持html-import特性')
        }
        return this;
    }
    this.loadLink = function (cb) {
        var link = document.createElement('link');
        var componentName = `/${component}.html`;
        var self = this;

        link.setAttribute('rel', 'import');
        link.setAttribute('href', this.options.root + componentName);
        link.onload = function handleLoad(e) {
            var content = document.querySelector(`[href *= "${componentName}"]`);

            if (!!content) {
                win.doc = content.import || "";
            } else {
                console.error('当前引用组件不存在!');
            }
            self.DefineComponent(cb)
        };
        link.onerror = this.handleError;
        document.head.appendChild(link)
    }

    this.DefineComponent = function (cb) {

        var self = this;
        customElements.define(this.tagName, class extends HTMLElement {
            constructor() {
                super();
            }
            async connectedCallback() {

                var tplId = self.data && self.data.name || 'template';
                if (tplId !== 'template') {
                    tplId = `#${tplId}`;
                }
                var dom = win.doc.querySelector(tplId);
                var template = "";
                if (dom) {
                    template = dom.content;
                } else {
                    console.error('template is not exist');
                    return;
                }

                const shadowRoot = this.attachShadow({ mode: "open" });

                cb && await cb(this, template);

                var page = self.render(self.escape2Html(template.querySelector(':not(style):not(script)').innerHTML), self.data)
                var style = template.querySelector('style');
                var js = template.querySelector('script');
                shadowRoot.innerHTML = page
                style && shadowRoot.appendChild(style)
                js && shadowRoot.appendChild(js)
            }

        })
    }
    this.escape2Html = function (str) {
        var arrEntities = { 'lt': '<', 'gt': '>', 'nbsp': ' ', 'amp': '&', 'quot': '"' };
        return str.replace(/&(lt|gt|nbsp|amp|quot);/ig, function (all, t) {
            return arrEntities[t];
        });
    }
    this.render = function (str, data) {
        //获取元素
        var element = document.getElementById(str);
        if (element) {
            //textarea或input则取value，其它情况取innerHTML
            var html = /^(textarea|input)$/i.test(element.nodeName) ? element.value : element.innerHTML;
            return tplEngine(html, data);
        } else {
            //是模板字符串，则生成一个函数
            //如果直接传入字符串作为模板，则可能变化过多，因此不考虑缓存
            return tplEngine(str, data);
        }

        function tplEngine(tpl, data) {
            var reg = /<%([^%>]+)?%>/g,
                regOut = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g,
                code = 'var r=[];\n',
                cursor = 0;
            if (JSON.stringify(data) === "{}") {
                console.warn('无渲染数据');
                return tpl;
            }
            var add = function (line, js) {
                js ? (code += line.match(regOut) ? line + '\n' : 'r.push(' + line + ');\n') :
                    (code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
                return add;
            }
            while (match = reg.exec(tpl)) {
                add(tpl.slice(cursor, match.index))(match[1], true);
                cursor = match.index + match[0].length;
            }
            add(tpl.substr(cursor, tpl.length - cursor));
            code += 'return r.join("");';

            return new Function(code.replace(/[\r\t\n]/g, '')).apply(data);
        };
    };
}

