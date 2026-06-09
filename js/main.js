// RASTREADOR 1: Ver si el archivo de configuración carga
jQuery.getJSON(GetQueryStringParams("config","config.json"), function(data) {
    console.log("LOG 1: config.json cargado con éxito", data);
    config=data;
    if (config.type!="network") {
        alert("Invalid configuration settings.");
        return;
    }
    console.log("LOG 2: Llamando a setupGUI");
    $(document).ready(setupGUI(config));
});

function initSigma(config) {
    var data=config.data;
    console.log("LOG 3: Iniciando initSigma con el archivo de datos:", data);

    var a = sigma.init(document.getElementById("sigma-canvas"))
        .drawingProperties(config.sigma.drawingProperties)
        .graphProperties(config.sigma.graphProperties)
        .mouseProperties(config.sigma.mouseProperties);

    sigInst = a;
    a.active = false;
    a.neighbors = {};
    a.detail = false;

    function dataReady() {
        console.log("LOG 5: ¡dataReady se ejecutó! El archivo se procesó correctamente.");
        
        console.log("LOG 6: Iniciando bucle iterNodes. Total nodos esperados:", a._core.graph.nodes.length);
        a.iterNodes(function(n) {
            if (!n.attr) n.attr = {};
            n.attr.originalColor = n.color;
        });

        console.log("LOG 7: Iniciando bucle iterEdges.");
        a.iterEdges(function(e) {
            if (!e.attr) e.attr = {};
            e.attr.originalColor = e.color;
        });

        console.log("LOG 8: Configurando clusters.");
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

        console.log("LOG 9: Ejecutando draw() final.");
        a.draw();
        configSigmaElements(config);
        setupZoomButtons();
        console.log("LOG 10: Fin de la inicialización completa.");
    }

    console.log("LOG 4: Intentando parsear el archivo de datos...");
    if (data.indexOf("gexf")>0 || data.indexOf("xml")>0)
        a.parseGexf(data,dataReady);
    else
        a.parseJson(data,dataReady);
}
