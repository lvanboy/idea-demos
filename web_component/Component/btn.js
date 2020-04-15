

var Btn = new JP('j-btn', {
    root: "/Component",
    filename: "button",
    data() {
        return {
        }
    },
    methods: {
        onClick(e) {
            console.log(e, 'click');
        }
    }

})

Btn.init(function (self, template) {
    //根据模板以及传入的属性，定制化
    let attrType = self.getAttribute('type');
    let event = self.getAttribute("@click");
    let btn = template.querySelector('.j-btn');
    let attr = self.getAttribute(":text");
    let eventRegister = false;
    for (let key in this.options.methods) {
        if (key === event) {
            eventRegister = true;
            self.addEventListener('click', this.options.methods[key], false)
        }
    }
    if (!eventRegister) {
        console.error('注册的方法不存在');
    }
    btn.setAttribute('data-type', attrType);

}.bind(Btn))





