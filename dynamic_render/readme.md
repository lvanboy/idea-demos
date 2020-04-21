## 动态渲染HTML节点的最佳方式

1.document.createDocumentFragment()

**DocumentFragment**: 文段片段接口，表示一个没有文档父级的最小文档对象，作为一个轻量版的Document使用，用于存储已排版好的或者XML片段。最大的区别：DocumentFragment不是真实DOM的一部分，而存在于内存中，插入到文档片段时不会引起页面回流且不会导致性能问题。兼容性IE9+

