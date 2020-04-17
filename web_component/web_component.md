# 我的前端组件化

## 构思

组件复用：template + data, 首先，template从何而来，可选择的方式有：ES6的模板字符串，利用webpack构建loader解析自定义的文件后缀，HTML文件的DOM结构。

ES6的模板字符串，在编写模板字符串，代码没有highlight的情况下，如果你有强迫症，建议配合可解析模板字符串的highlight插件使用，在VScode中，存在插件es6-string-html；

webpack构建loader这种方式，首先依赖于webpack构建工具，并且根据webpack提供的API规则去制定自定义的loader解析，相对而言，需要额外的开发成本；

在不使用打包工具去创建自定义文件后缀的模板情况下，期望使用原生的HTML引入作为template基础，哪些技术可实现HTML的引入呢？

1. w3-include-html

2. html-import

w3-include-html基本用法：

``` html
<script>
    function includeHTML() {
        var z, i, elmnt, file, xhttp;
        var res;
        z = document.getElementsByTagName("*");
        for (i = 0; i < z.length; i++) {
            elmnt = z[i];

            file = elmnt.getAttribute("w3-include-html");
            if (file) {

                res = new Promise(function(resolve, reject) {
                    xhttp = new XMLHttpRequest();
                    xhttp.open("GET", file, true);
                    xhttp.send();
                    xhttp.onreadystatechange = function() {
                        if (this.readyState == 4) {
                            if (this.status == 200) {
                                resolve(this.responseText);
                            }
                            if (this.status == 404) {
                                reject(null)
                            }
                            elmnt.removeAttribute("w3-include-html");
                            includeHTML();
                        }
                    }

                })
                res.then(function(data) {
                    if (data) {
                        elmnt.innerHTML = data;
                    } else {
                        console.error('模板不存在');
                    }
                })

                return;
            }
        }
    };
</script>

<div w3-include-html="template.html"></div>
```

html-import 属于deprecated（不推荐使用），兼容性差，并且随时可以能被删除的，但可使用[webcomponents.js](https://github.com/webcomponents/webcomponentsjs)polyfill，其基本用法：

``` html
<script>
    var link = document.querySelector("[rel = 'import']"),
        doc;
    if (link) {
        doc = link.import;
        console.log(doc)
    } else {
        console.warn('当前页面无模板');
    }
</script>
<link rel="import" href="template.html">
```

择优录取，不管怎样，template引入的问题算是找到解决方案，进一步简化封装，封装成加载特定HTML的template：

``` js
    this.includeHTML = function(filename) {

        return new Promise(function(resolve, reject) {

            let xhttp = new XMLHttpRequest();
            xhttp.open("GET", filename, true);
            xhttp.send();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        resolve(this.responseText);
                    } else if (this.status == 404) {
                        reject(null)
                    }
                }
            }
            xhttp.onerror = function(err) {
                console.log(err)
            }

        })
    }
```

那么template模板的导出应该是什么？通常来说，是语义化的简短命名的自定义标签，那么如何将自定义标签映射成模板呢？
基于webComponent的规范，可通过 `customElements.define(tagName,class extend HTMLElement)` , 从任意HTML标签类上继承自定义标签类，在自定义标签类的构造函数和生命周期中定制化，这个自定义标签的特性；
在自定义类中，可将template挂载到Shadow Dom节点上，Shadow Dom也是依附在自定义标签上的，这样一来，template与自定义标签就关联起来了，封装后的代码：

``` js
    this.DefineComponent = function(tagName, template) {

        customElements.define(tagName, class extends HTMLElement {
            constructor() {
                super();
            }
            //自定义标签的生命周期
            async connectedCallback() {
                const shadowRoot = this.attachShadow({
                    mode: "open"
                });
                try {
                    shadowRoot.innerHTML = template
                } catch (err) {
                    console.error(err)
                }
            }

        })
    }
```

现在，应该考虑data方面的问题了，data 可分为异步获取的数据，用户的配置数据以及自定义标签上的属性和事件；异步请求的数据，需要提供一个生命周期去获取，假设现有对象：

``` js
export default {
    data() {
        return {

        }
    },
    mehtods: {

    }

}
```

用户配置的数据放在data函数返回的对象里，methods对象提供一些方法，操作数据; 把这个数据直接喂给模板template？你可以这么做，但自定义标签上的属性以及属性值也是模板所需要的数据，所以这里先处理属性和事件，它们恰巧与data与methods息息相关
处理的方案是：将自定义标签上所有属性与data函数返回的对象合并，为自定义标签上的事件注册响应函数，响应函数应在methods中定义，否则发出异常警告。

``` js
    this.mergeData = function() {
        let attrs = [],
            eventName = "";
        var obj = {};
        //这里的this是自定义标签dom，jp为组件实例对象（当然你可以任意命名），jp.options即上述所提的：{data(){return {}},methods:{}}
        if (this.hasAttributes()) {
            attrs = this.attributes;
            for (let i = 0, len = attrs.length; i < len; i++) {
                if (attrs[i].name.startsWith("@")) {
                    if (jp.options.methods[attrs[i].value]) {
                        eventName = attrs[i].name.slice(1);
                        this.addEventListener( `${eventName}` , jp.options.methods[attrs[i].value])
                    } else {
                        console.error( `缺少方法:${attrs[i].value}` )
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
```

然后，将合并后的数据data与template进行渲染，这里的渲染规则也是自定义的，你大概可以理解为模板引擎，这里贴出精简版本的渲染函数:

``` js
    this.render = function(str, data) {
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
            var add = function(line, js) {
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
```

按照以上的渲染规则，模板的书写方法应该为，以<%  %>这形式，包裹js逻辑代码和数据变量：

``` html
<div class="list-container">
    <ul>
        <% for(var i = 0,len = this.listData.length ; i < len; i++) { %>
        <li class="item-li">帅 <% this.listData[i] %></li>
        <% } %>
    </ul>
</div>
```

将渲染完的数据，挂载在Shadow Dom上，并提供自定义命名的生命周期函数，如create、mounted等等：

``` js
    this.DefineComponent = function() {
        var self = this;
        customElements.define(this.tagName, class extends HTMLElement {
            constructor() {
                super();
            }
            async connectedCallback() {
                //获取所有数据：包括用户数据和自定义标签属性
                self.mergeData.call(this);
                const shadowRoot = this.attachShadow({
                    mode: "open"
                });

                self.options.connected && await self.options.connected(self, this, self.template);
                try {
                    var page = self.render(self.template, self.data)
                    page = page.replace(/<template((.)*?)>/g, "");
                    shadowRoot.innerHTML = page
                    console.log( `${self.tagName}自定义标签已注册!!` );
                } catch (err) {
                    console.error(err)
                }
            }

        })
    }
```

因为我们期望template的构成是使用 `<template></template>` 标签包裹的，而template标签本身是不被浏览器解析的，所以将渲染后的模板字符串中template标签替换成空格；
这里的声明周期函数命名为connected，由用户传入，如：

``` js
export default {
    connected() {
        console.log('connected')
    },
    data() {
        return {
            sourceData: {}
        }
    },
    mehtods: {
        onClick() {
            console.log("点击了")
        }
    }
}
```

综上所述，其每一步都具有扩展的空间，这里只是换一个角度思考，提供一种前端组件化的实现思路，完整代码如下：
core.js

``` js
var JP = function(tagName, options) {
    let jp = this;

    this.tagName = tagName;
    this.options = options;
    this.root = this.options.root ? this.options.root : '/Component/'
    this.data = this.options.data && this.options.data() || {};
    this.doc = "";
    this.component = `${this.root}${this.options.filename}.html` || "index.html";

    this.supportsImports = function() {
        return 'import' in document.createElement('link');
    }

    this.handleError = function(msg) {
        console.error(msg)
    }
    this.init = function() {
        this.loadComponent();
        return this;
    }

    this.loadComponent = async function() {
        let res = await this.includeHTML();
        if (res) {
            this.template = res;
            this.DefineComponent()
        } else {
            this.handleError('组件路径不存在!');
        }

    }

    this.includeHTML = function() {

        return new Promise(function(resolve, reject) {

            let xhttp = new XMLHttpRequest();
            xhttp.open("GET", jp.component, true);
            xhttp.send();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        resolve(this.responseText);
                    } else if (this.status == 404) {
                        reject(null)
                    }
                }
            }
            xhttp.onerror = function(err) {
                console.log(err)
            }

        })
    }

    this.DefineComponent = function() {

        var self = this;
        customElements.define(this.tagName, class extends HTMLElement {
            constructor() {
                super();
            }
            async connectedCallback() {
                //获取所有属性
                self.mergeData.call(this);
                const shadowRoot = this.attachShadow({
                    mode: "open"
                });

                self.options.connected && await self.options.connected(self, this, self.template);
                try {
                    var page = self.render(self.template, self.data)
                    page = page.replace(/<template((.)*?)>/g, "");
                    shadowRoot.innerHTML = page
                    console.log( `${self.tagName}自定义标签已注册!!` );
                } catch (err) {
                    console.error(err)
                }
            }

        })
    }
    this.mergeData = function() {
        let attrs = [],
            eventName = "";
        var obj = {};
        if (this.hasAttributes()) {
            attrs = this.attributes;
            for (let i = 0, len = attrs.length; i < len; i++) {
                if (attrs[i].name.startsWith("@")) {
                    if (jp.options.methods[attrs[i].value]) {
                        eventName = attrs[i].name.slice(1);
                        this.addEventListener( `${eventName}` , jp.options.methods[attrs[i].value])
                    } else {
                        console.error( `缺少方法:${attrs[i].value}` )
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
    this.log = function(l) {
        console.log(l)
    }

    this.escape2Html = function(str) {
        var arrEntities = {
            'lt': '<',
            'gt': '>',
            'nbsp': ' ',
            'amp': '&',
            'quot': '"'
        };
        return str.replace(/&(lt|gt|nbsp|amp|quot);/ig, function(all, t) {
            return arrEntities[t];
        });
    }
    this.render = function(str, data) {
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
            var add = function(line, js) {
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
```

## 组件的定义

template文件 list.html

``` html
<template id="list">
    <style>
        ul,
        li {
            margin: 0;
            padding: 0;

        }

        ul {
            list-style: none;
        }

        .item-li {
            display: inline-block;
            color: royalblue;
            padding: 6px 10px;
            border: 1px solid deepskyblue;
        }
    </style>

    <div class="list-container">
        <ul>
            <% for(var i = 0,len = this.listData.length ; i < len; i++) { %>
            <li class="item-li">帅 <% this.listData[i] %></li>
            <% } %>
        </ul>
        <j-icon></j-icon>
    </div>

</template>
<script type="module">
    import "./icon.js"; //如果你没有定义icon组件，请将这里和j-icon标签注释
</script>
```

数据对象以及实例化文件 list.js , 其中的filename用于指定读取的HTML的文件名，如果你的组件不是定义在/Component目录下，使用root变量声明构建组件文件所在文件夹

``` js
import JP from "./core-other.js";

var List = new JP('j-list', {
    // root:"/",
    filename: "list",
    data() {
        return {
            listData: []
        }
    },
    async connected(self, customTag, template) {

        let data = await this.methods.getdata();
        self.data.listData = data.data;
        return this;
    },
    methods: {
        getdata() {
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    resolve({
                        data: ['html', 'css', 'js']
                    })
                }, 1000)
            })
        },
        onClick(e) {
            console.log('click', e);
        }
    }
})
```

## 组件的使用

``` html
<j-list @click="onClick"></j-list>
```

其他组件定义和使用的例子，为了避免跨域，你应该将文件挂载本地服务器上，使用vscode，右击html文件，选中open with Live Server，此项目[github](https://github.com/lvanboy/idea-demos/tree/master/web_component)地址，
如果你有其他想法或者问题，欢迎留言。

