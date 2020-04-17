
import JP from "./core-other.js";

var List = new JP('j-list', {

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
            return new Promise(function (resolve, reject) {
                setTimeout(function () {
                    resolve({ data: ['html', 'css', 'js'] })
                }, 1000)
            })
        }
    }
})


















