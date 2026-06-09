var sigInst, canvas, $GP;
var selectedNode = null; // Nodo fijado
var config={};

// 1. Declaramos la función primero para que el navegador la conozca desde el inicio
function GetQueryStringParams(sParam,defaultVal) {
    var sPageURL = ""+window.location;
    if (sPageURL.indexOf("?")==-1) return defaultVal;
    sPageURL=sPageURL.substr(sPageURL.indexOf("?")+1);    
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
    return defaultVal;
}

// 2. Ahora sí llamamos al JSON de forma segura
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

// ==========================
// INIT SIGMA
// ==========================
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
        console.log("LOG 5: ¡dataReady ejecutado! Estructurando nodos y aristas...");
        
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

        // Corrección de renderizado para producción (GitHub Pages)
        a.draw();
        
        setTimeout(function() {
            if (typeof sigInst.resize === "function") {
                sigInst.resize();
            }
            sigInst.draw();
            console.log("LOG 6: Redibujado de seguridad completado.");
        }, 150);

        configSigmaElements(config);
        setupZoomButtons();
        console.log("LOG 7: Fin de la inicialización completa.");
    }

    console.log("LOG 4: Parseando archivo de datos...");
    if (data.indexOf("gexf")>0 || data.indexOf("xml")>0)
        a.parseGexf(data,dataReady);
    else
        a.parseJson(data,dataReady);
}

// ==========================
// GUI
// ==========================
function setupGUI(config) {
    $("#title").html("<h2>"+config.text.title+"</h2>");
    $("#titletext").html(config.text.intro);

    $GP = {
        calculating: false,
        showgroup: false
    };

    $GP.form = $("#mainpanel").find("form");
    $GP.search = new Search($GP.form.find("#search"));

    if (!config.features.search) $("#search").hide();
    if (!config.features.groupSelectorAttribute) $("#attributeselect").hide();

    $GP.cluster = new Cluster($GP.form.find("#attributeselect"));

    config.GP=$GP;
    initSigma(config);
}

// ==========================
// HOVER + SELECCIÓN
// ==========================
function configSigmaElements(config) {
    var greyColor = '#e6e6e6';

    sigInst.bind('overnodes', function(e) {
        if (selectedNode !== null) return;

        var nodes = e.content;
        var neighbors = {};

        sigInst.iterEdges(function(edge) {
            if(nodes.indexOf(edge.source) >= 0 || nodes.indexOf(edge.target) >= 0){
                neighbors[edge.source] = 1;
                neighbors[edge.target] = 1;
                edge.color = edge.attr.originalColor;
            } else {
                edge.color = greyColor;
            }
        });

        sigInst.iterNodes(function(n) {
            if(neighbors[n.id]){
                n.color = n.attr.originalColor;
            } else {
                n.color = greyColor;
            }
        }).draw(2,2,2);
    });

    sigInst.bind('outnodes', function() {
        if (selectedNode !== null) return;
        resetGraph();
    });
}

function nodeActive(nodeId) {
    selectedNode = nodeId;
    var neighbors = {};
    neighbors[nodeId] = 1;

    sigInst.iterEdges(function(edge) {
        if (edge.source === nodeId || edge.target === nodeId) {
            neighbors[edge.source] = 1;
            neighbors[edge.target] = 1;
        }
    });

    sigInst.iterEdges(function(edge) {
        if (neighbors[edge.source] && neighbors[edge.target]) {
            edge.color = edge.attr.originalColor;
            edge.hidden = false;
        } else {
            edge.color = '#e6e6e6';
        }
    });

    sigInst.iterNodes(function(n) {
        if (neighbors[n.id]) {
            n.color = n.attr.originalColor;
            n.hidden = false;
        } else {
            n.color = '#e6e6e6';
        }
    });

    var node = sigInst._core.graph.nodesIndex[nodeId];
    
    if ($("#attributepane").length > 0) {
        $(".nodeattributes .p, .nodeattributes .link").show();
        $("#attributepane .name").html(node.label);
        
        var dataHtml = "<table style='width:100%; border-collapse:collapse; margin-bottom:10px; font-size:11px;'>";
        for (var attr in node.attributes) {
            dataHtml += "<tr style='border-bottom:1px dashed #eee;'>";
            dataHtml += "<td style='padding:3px 0; color:#666;'><strong>" + attr + ":</strong></td>";
            dataHtml += "<td style='padding:3px 0; text-align:right; color:#000;'>" + node.attributes[attr] + "</td>";
            dataHtml += "</tr>";
        }
        dataHtml += "</table>";
        $("#attributepane .data").html(dataHtml);
        
        var connectionsHtml = "";
        sigInst.iterEdges(function(edge) {
            if (edge.source === nodeId || edge.target === nodeId) {
                var connectedNodeId = (edge.source === nodeId) ? edge.target : edge.source;
                var connectedNode = sigInst._core.graph.nodesIndex[connectedNodeId];
                connectionsHtml += "<li style='padding:4px 0; border-bottom:1px solid #f0f0f0; color:#0066cc; text-decoration:underline; font-size:12px; list-style-type:none;' onclick='nodeActive(\"" + connectedNodeId + "\")'>" + connectedNode.label + "</li>";
            }
        });

        $(".nodeattributes .p").html("Connections:").show();
        $("#attributepane .link ul").html(connectionsHtml).show();
        $("#attributepane").show();
    }

    sigInst.draw(2,2,2);
}

function resetGraph() {
    selectedNode = null;
    sigInst.iterEdges(function(e){
        e.color = e.attr.originalColor;
        e.hidden = false;
    });
    sigInst.iterNodes(function(n){
        n.color = n.attr.originalColor;
        n.hidden = false;
    });
    if ($("#attributepane").length > 0) {
        $("#attributepane").hide();
    }
    sigInst.draw(2,2,2);
}

$(document).on("click", ".left-close", function() {
    resetGraph();
});

function setupZoomButtons() {
    $("#zoom .z").unbind('click').click(function() {
        var rel = $(this).attr("rel");
        var currentX = sigInst._core.camera.x;
        var currentY = sigInst._core.camera.y;
        var currentRatio = sigInst._core.camera.ratio;

        if (rel === "in") {
            sigInst.position(currentX, currentY, currentRatio * 0.7).draw();
        } else if (rel === "out") {
            sigInst.position(currentX, currentY, currentRatio * 1.3).draw();
        } else if (rel === "center") {
            sigInst.position(0, 0, 1).draw();
            resetGraph();
        }
    });
}

function Search(a) {
    this.input = a.find("input[name=search]");
    var self = this;

    this.input.focus(function() {
        if ($(this).val() === "Search by name") {
            $(this).val("");
            $(this).removeClass("empty");
        }
    });

    this.input.blur(function() {
        if ($(this).val() === "") {
            $(this).val("Search by name");
            $(this).addClass("empty");
        }
    });

    this.input.keydown(function (e) {
        if (e.which == 13) {
            var value = $.trim(self.input.val().toLowerCase());
            var foundNodeId = null;

            if (value === "" || value === "search by name") {
                resetGraph();
                return false;
            }

            sigInst.iterNodes(function(n){
                if(n.label.toLowerCase().indexOf(value) !== -1){
                    foundNodeId = n.id;
                }
            });

            if (foundNodeId !== null) {
                nodeActive(foundNodeId);
            } else {
                alert("No se encontró ninguna institución con ese nombre.");
            }
            return false;
        }
    });
}

function Cluster(a) {
    this.cluster = a;
}

window.addEventListener("dblclick", function() {
    resetGraph();
});
