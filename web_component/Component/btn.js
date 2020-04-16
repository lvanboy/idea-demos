
import JP from "./core.js";
var Btn = new JP('j-btn', {
    filename: "button",
    data() {
    },
    methods: {
        onClick(e) {
            console.log(e, 'click');
        }
    }

})

Btn.init(function (self, template) {
    //根据模板以及传入的属性，定制化

}.bind(Btn))







