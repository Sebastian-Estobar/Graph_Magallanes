function initSigma(config) {
    var data = config.data;

    var a = sigma.init(document.getElementById("sigma-canvas"))
        .drawingProperties(config.sigma.drawingProperties)
        .graphProperties(config.sigma.graphProperties)
        .mouseProperties(config.sigma.mouseProperties);

    sigInst = a;
    a.active = false;
    a.neighbors = {};
    a.detail = false;

    function dataReady() {
        a.iterNodes(function(n) {
            if (!n.attr) n.attr = {};
            n.attr.originalColor = n.color;
        });

        a.iterEdges(function(e) {
            if (!e.attr) e.attr = {};
            e.attr.originalColor = e.color;
        });

        a.clusters = {};
        a.iterNodes(function (b) {
            if (!a.clusters[b.color]) {
                a.clusters[b.color] = [];
            }
            a.clusters[b.color].push(b.id);
        });

        a.bind("upnodes", function (e) {
            var nodeId = e.content[0];
            nodeActive(nodeId);
        });

        // Forzar el dibujo con un desfase mínimo para dar tiempo al render en producción
        a.draw();
        
        setTimeout(function() {
            if (typeof sigInst.resize === "function") {
                sigInst.resize();
            }
            sigInst.draw();
        }, 100);
        
        configSigmaElements(config);
        setupZoomButtons();
    }

    if (data.indexOf("gexf")>0 || data.indexOf("xml")>0)
        a.parseGexf(data,dataReady);
    else
        a.parseJson(data,dataReady);
}
