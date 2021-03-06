


var JP = function (tagName, options) {
    let jp = this;

    this.tagName = tagName;
    this.options = options;
    this.options.root = this.options.root ? this.options.root : '/Component'
    this.data = this.options.data && this.options.data() || {};
    this.doc = "";
    var component = this.options.filename || "index.html";

    this.supportsImports = function () {
        return 'import' in document.createElement('link');
    }

    this.handleError = function (e) {
        console.error("组件路径不存在!")
    }
    this.init = function () {
        if (this.supportsImports()) {
            this.loadLink();
            // Good to go!
        } else {
            // Use other libraries/require systems to load files.
            console.error('当前浏览器不支持html-import特性')
        }
        return this;
    }
    this.loadLink = function () {
        let link = document.createElement('link');
        let componentName = `/${component}.html`;
        let self = this;
        let content = null;
        link.setAttribute('rel', 'import');
        link.setAttribute('href', this.options.root + componentName);
        link.onload = function handleLoad(e) {
            content = document.querySelector(`[href *= "${componentName}"]`);
            if (!!content) {
                self.doc = content.import || "";
            } else {
                console.error('当前引用组件不存在!');
            }
            self.DefineComponent()
        };
        link.onerror = this.handleError;
        document.head.appendChild(link)
    }



    this.DefineComponent = function () {

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

                var dom = self.doc.querySelector(tplId);
                var template = "";
                if (dom) {
                    template = dom.content;
                    self.template = template.querySelector(':not(style):not(script)');
                } else {
                    console.error('template is not exist');
                    return;
                }
                //获取所有属性
                self.mergeData.call(this);
                const shadowRoot = this.attachShadow({ mode: "open" });
                self.options.connected && await self.options.connected(self, this, template);
                try {
                    var page = self.render(self.escape2Html(self.template.innerHTML), self.data)
                    var style = template.querySelector('style');
                    var js = template.querySelector('script');
                    shadowRoot.innerHTML = page
                    // console.log(style.innerHTML + 'hello')
                    style && shadowRoot.appendChild(style)
                    js && shadowRoot.appendChild(js)
                    console.log(`${self.tagName}自定义标签已注册!!`);
                } catch (err) {
                    console.error(err)
                }
            }

        })
    }
    this.mergeData = function () {
        let attrs = "", eventName = "click";
        var obj = {};
        if (this.hasAttributes()) {
            attrs = this.attributes;
            for (let i = 0, len = attrs.length; i < len; i++) {
                if (attrs[i].name.startsWith("@")) {
                    if (jp.options.methods[attrs[i].value]) {
                        eventName = attrs[i].name.slice(1);
                        this.addEventListener(`${eventName}`, jp.options.methods[attrs[i].value])
                    } else {
                        console.error(`缺少方法:${attrs[i].value}`)
                    }
                } else if (!attrs[i].value) {
                    obj[attrs[i].name] = true;
                } else {
                    obj[attrs[i].name] = attrs[i].value;
                }

            }
            Object.assign(jp.data, obj)
        }

    }
    this.log = function (l) {
        console.log(l)
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
                match = undefined,
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
    this.init()
}

export default JP

