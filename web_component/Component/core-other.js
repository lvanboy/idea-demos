var JP = function (tagName, options) {
    let jp = this;

    this.tagName = tagName;
    this.options = options;
    this.root = this.options.root ? this.options.root : '/Component/'
    this.data = this.options.data && this.options.data() || {};
    this.doc = "";
    this.component = `${this.root}${this.options.filename}.html` || "index.html";



    this.supportsImports = function () {
        return 'import' in document.createElement('link');
    }

    this.handleError = function (msg) {
        console.error(msg)
    }
    this.init = function () {
        this.loadComponent();
        return this;
    }


    this.loadComponent = async function () {
        let res = await this.includeHTML();
        if (res) {
            this.template = res;
            this.DefineComponent()
        } else {
            this.handleError('组件路径不存在!');
        }

    }


    this.includeHTML = function () {

        return new Promise(function (resolve, reject) {

            let xhttp = new XMLHttpRequest();
            xhttp.open("GET", jp.component, true);
            xhttp.send();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        resolve(this.responseText);
                    } else if (this.status == 404) {
                        reject(null)
                    }
                }
            }
            xhttp.onerror = function (err) {
                console.log(err)
            }

        })
    }

    this.DefineComponent = function () {

        var self = this;
        customElements.define(this.tagName, class extends HTMLElement {
            constructor() {
                super();
            }
            async connectedCallback() {
                //获取所有属性
                self.mergeData.call(this);
                const shadowRoot = this.attachShadow({ mode: "open" });

                self.options.connected && await self.options.connected(self, this, self.template);
                try {
                    var page = self.render(self.template, self.data)
                    page = page.replace(/<template((.)*?)>/g, "");
                    shadowRoot.innerHTML = page
                    console.log(`${self.tagName}自定义标签已注册!!`);
                } catch (err) {
                    console.error(err)
                }
            }

        })
    }
    this.mergeData = function () {
        let attrs = [], eventName = "";
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

    this.init();

}

export default JP