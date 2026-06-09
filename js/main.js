// ==========================
// INIT SIGMA
// ==========================
function initSigma(config) {
    var data = config.data;

    // REPARACIÓN DEFINITIVA: Forzar dimensiones físicas reales en el contenedor antes de iniciar Sigma
    var canvasDiv = document.getElementById("sigma-canvas");
    if (canvasDiv) {
        var parentWidth = canvasDiv.parentElement ? canvasDiv.parentElement.clientWidth : window.innerWidth;
        var parentHeight = canvasDiv.parentElement ? canvasDiv.parentElement.clientHeight : window.innerHeight;
        
        // Si el contenedor mide 0 o no ha cargado, asignamos el viewport completo de respaldo
        if (!parentWidth || parentWidth === 0) parentWidth = window.innerWidth;
        if (!parentHeight || parentHeight === 0) parentHeight = window.innerHeight;
        
        canvasDiv.style.width = parentWidth + "px";
        canvasDiv.style.height = parentHeight + "px";
    }

    var a = sigma.init(canvasDiv)
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

        // Aseguramos que Sigma recalcule su layout interno con las medidas fijadas
        if (typeof a.resize === "function") {
            a.resize();
        }

        // Forzar centrado automático de la cámara para que el grafo aparezca en pantalla
        if (a._core && a._core.camera) {
            a.position(0, 0, 1);
        }

        a.draw();
        
        // Un segundo pase de renderizado preventivo por si el DOM tardó en estabilizarse
        setTimeout(function() {
            if (typeof sigInst.resize === "function") sigInst.resize();
            sigInst.draw();
        }, 150);
        
        configSigmaElements(config);
        setupZoomButtons();
    }

    if (data.indexOf("gexf") > 0 || data.indexOf("xml") > 0)
        a.parseGexf(data, dataReady);
    else
        a.parseJson(data, dataReady);
}
