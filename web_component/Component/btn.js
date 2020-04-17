
import JP from "./core-other.js";
var Btn = new JP('j-btn', {
    filename: "button",
    connected() {
        console.log('自定义标签已插入');
    },
    data() {
    },
    methods: {
        onClick(e) {
            console.log(e, 'click');
        },
        onFocus(e) {
            console.log(e, 'focus')
        }
    }

})











