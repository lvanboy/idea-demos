

var List = new JP('j-list', {
    root: "/Component",
    filename: "list",
    data() {
        return {
            listData: []
        }
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

List.init(async function () {
    let data = await this.options.methods.getdata();
    this.data.listData = data.data;
    return this;
}.bind(List))






