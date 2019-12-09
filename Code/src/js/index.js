window.addEventListener('DOMContentLoaded', () => {

    // scene and camera
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.lookAt(0, 0, 0);

    var renderer = new THREE.WebGLRenderer();
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2;
    controls.update()

    camera.position.set(3, -2.15, -3);
    renderer.setSize(600, 400);
    document.getElementById('scene').appendChild(renderer.domElement);

    // Adding axes to scene
    var axesHelper = new THREE.AxesHelper(1000);
    axesHelper.translateY(-2);
    axesHelper.rotation.x = -Math.PI / 2;
    scene.add(axesHelper);

    var loss_mesh = {};

    var loss_flag = {
        'densenet': 0,
        'resnet_no_short': 0,
        'resnet': 0,
        'vgg': 0,
    };

    var file_names = [
        'densenet_train_loss.json',
        'resnet_ns_train_loss.json',
        'resnet_train_loss.json',
        'vgg_train_loss.json'
    ]

    var xDirection = [];
    var yDirection = [];

    // Load X-Direction and Y-Direction files
    d3.queue()
        .defer(d3.csv, 'assets/data/xDirection.csv')
        .defer(d3.csv, 'assets/data/yDirection.csv')
        .await(loadXY)

    function loadXY(error, xData, yData) {
        for (var k = 0; k < xData.length; k++) {
            xDirection.push(parseFloat(xData[k]['X']))
            yDirection.push(parseFloat(yData[k]['Y']))
        }
    }

    // Adding event listeners to the 'model' buttons
    function addEvent(id, model) {
        d3.select(id)
            .on('click', function () {
                if (loss_flag[model] === 0) {
                    scene.add(loss_mesh[model])
                    loss_flag[model] = 1;

                    d3.select(id)
                        .style('background-color', '#000080')

                } else {
                    scene.remove(loss_mesh[model]);
                    loss_flag[model] = 0;

                    d3.select(id)
                        .style('background-color', '#3174c0')
                }
                //drawCrossSection(d3.select('#myRange').value)
            })
    }

    // Load data of a model
    function loadData(filename) {
        d3.json('assets/data/' + filename, function (data) {

            if (filename === 'resnet_train_loss.json') {
                loss_mesh['resnet'] = create_mesh(data)
                addEvent('#b_resnet_loss', 'resnet');

                loadHeatMap('resnet')

                // Enable resnet by default
                scene.add(loss_mesh['resnet']);

                loss_flag['resnet'] = 1;
                d3.select('#b_resnet_loss')
                    .style('background-color', '#000080')

                d3.select('#crossSectionButton')
                    .style('background-color', '#238b45')

                drawCrossSection(0)
            }

            if (filename === 'densenet_train_loss.json') {
                loss_mesh['densenet'] = create_mesh(data)
                addEvent('#b_densenet_loss', 'densenet');

                loadHeatMap('densenet')
            }

            if (filename === 'vgg_train_loss.json') {
                loss_mesh['vgg'] = create_mesh(data)
                addEvent('#b_vgg_loss', 'vgg');


                loadHeatMap('vgg')
            }

            if (filename === 'resnet_ns_train_loss.json') {
                loss_mesh['resnet_no_short'] = create_mesh(data)
                addEvent('#b_resnet_ns_loss', 'resnet_no_short');

                loadHeatMap('resnet_no_short')
            }
        })
    }

    for (i = 0; i < file_names.length; i++) {
        loadData(file_names[i]);
    }

    // Creating the 3D surface
    function create_mesh(data) {
        var X_keys = Object.keys(data)
        var Y_keys = Object.keys(data)

        var geometry = new THREE.Geometry();

        var xgrid = [];
        var ygrid = [];
        var values = [];

        for (i = 0; i < xDirection.length; i++) {
            for (j = 0; j < yDirection.length; j++) {

                xValue = xDirection[i];
                yValue = yDirection[j];
                zValue = data[xValue][yValue];

                xgrid.push(xValue);
                ygrid.push(yValue);
                values.push(zValue);
            }
        }

        var vertices_count = values.length;

        var scalefacz = 0.05;

        var color = d3.scaleLinear()
            .domain([d3.min(values), (d3.min(values) + d3.max(values) / 2), d3.max(values)])
            .range(['blue', 'skyblue', 'red'])

        for (var k = 0; k < vertices_count; ++k) {
            var newvert = new THREE.Vector3((xgrid[k]), (ygrid[k]), (values[k]) * scalefacz);
            geometry.vertices.push(newvert);
        }

        for (var j = 0; j < X_keys.length - 1; j++) {
            for (var i = 0; i < Y_keys.length - 1; i++) {

                var v0 = j * X_keys.length + i;
                var v1 = v0 + 1;

                var v2 = (j + 1) * X_keys.length + i + 1;
                var v3 = v2 - 1;

                face1 = new THREE.Face3(v0, v1, v2);
                face2 = new THREE.Face3(v2, v3, v0);

                face1.vertexColors[0] = new THREE.Color(color(values[v0]));
                face1.vertexColors[1] = new THREE.Color(color(values[v1]));
                face1.vertexColors[2] = new THREE.Color(color(values[v2]));

                face2.vertexColors[0] = new THREE.Color(color(values[v2]));
                face2.vertexColors[1] = new THREE.Color(color(values[v3]));
                face2.vertexColors[2] = new THREE.Color(color(values[v0]));

                geometry.faces.push(face1);
                geometry.faces.push(face2);
            }
        }

        var material = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            color: 0xffffff,
            vertexColors: THREE.VertexColors,
            opacity: 1,
            wireframe: false
        });

        var mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = -2;

        return mesh;
    }

    // Tooltip for 2D crosssection and heatmap
    var tooltip2 = d3.select("body")
        .append("div")
        .style('position', 'absolute')

    var tooltipOffset = {
        x: 5,
        y: -25
    };

    function moveTooltip() {
        tooltip2.style("top", (d3.event.pageY + tooltipOffset.y) + "px")
            .style("left", (d3.event.pageX + tooltipOffset.x) + "px");
    }

    function showTooltip(model, xDirection, yDirection) {
        moveTooltip();

        var model_print;

        if (model == 'resnet') {
            model_print = 'ResNet';
        } else if (model == 'densenet') {
            model_print = 'DenseNet';
        } else if (model == 'vgg') {
            model_print = 'VGG';
        } else {
            model_print = "ResNet No Short";
        }

        tooltip2.style("display", "block")
            .style('border', 'solid 1px black')
            .style('background', 'lightgray')
            .style('padding', '2px')
            .html('Model:' + model_print + '</br>' + 'X Direction: ' + xDirection + '</br>' +
                'Y Direction: ' + yDirection)
    }

    function showHeatmapTooltip(xDirection, yDirection, loss) {
        moveTooltip();
        tooltip2.style("display", "block")
            .style('border', 'solid 1px black')
            .style('background', 'lightgray')
            .style('padding', '2px')
            .html('X Direction: ' + xDirection + '</br>' +
                'Y Direction: ' + yDirection + '</br>' +
                'Loss: ' + loss)
    }

    function hideTooltip() {
        tooltip2.style("display", "none");
    }

    // Cross section of the 3D surface
    function drawCrossSection(loss) {
        d3.select('#crossSection').select('svg').remove();

        var margin = {
            top: 10,
            right: 30,
            bottom: 30,
            left: 60
        }

        var width = 600 - margin.left - margin.right;
        var height = 400 - margin.top - margin.bottom;

        var svg = d3.select("#crossSection")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var xScale = d3.scaleLinear()
            .domain([-1, 1])
            .range([0, width]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale));

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate(' + width / 2 + ',' + height + ')')

        var yScale = d3.scaleLinear()
            .domain([-1, 1])
            .range([height, 0]);

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate(0,' + height / 2 + ')rotate(-90)')

        svg.append("g")
            .call(d3.axisLeft(yScale));

        var filteredData = {};

        for (model in loss_mesh) {
            if (loss_flag[model] === 1) {
                var points = [];
                loss_mesh[model].geometry.vertices.forEach(element => {
                    if ((parseFloat(loss) - 0.01) <= element.z && (parseFloat(loss) + 0.01) >= element.z) {
                        var filteredX = element.x;
                        var filteredY = element.y;
                        var filteredZ = element.z;
                        var modelName = model;

                        points.push({
                            filteredX,
                            filteredY,
                            filteredZ,
                            modelName
                        })
                    }
                });
                filteredData[model] = points;
            }
        }

        var colors = d3.scaleOrdinal()
            .domain(['resnet', 'densenet', 'resnet_no_short', 'vgg'])
            .range(['#9e9ac8', '#a1d76a', '#f03b20', '#ffe200'])

        for (model in filteredData) {
            svg.append('g')
                .selectAll("circle")
                .data(filteredData[model])
                .enter()
                .append("circle")
                .attr("cx", function (d) {
                    return xScale(d.filteredX);
                })
                .attr("cy", function (d) {
                    return yScale(d.filteredY);
                })
                .attr("r", 4)
                .style("fill", function (d) {
                    return colors(model)
                })
                .on("mouseover", function (d) {
                    showTooltip(d.modelName, d.filteredX, d.filteredY)
                })
                .on("mousemove", moveTooltip)
                .on("mouseout", hideTooltip)
        }
    }

    // Build the heatmap
    function loadHeatMap(modelName) {
        var margin = {
            top: 30,
            right: 30,
            bottom: 30,
            left: 30
        };

        var width = 450 - margin.left - margin.right;
        var height = 450 - margin.top - margin.bottom;

        var svg = d3.select('#heatmap_' + modelName)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

        var xScale = d3.scaleBand()
            .range([0, width])
            .domain(xDirection)

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale).tickValues(xScale.domain().filter(function (d, i) {
                return !(i % 5)
            })));

        var yScale = d3.scaleBand()
            .range([height, 0])
            .domain(yDirection)

        svg.append("g")
            .call(d3.axisLeft(yScale).tickValues(yScale.domain().filter(function (d, i) {
                return !(i % 5)
            })));

        var dataForHeatMap = [];
        var losses = [];

        loss_mesh[modelName].geometry.vertices.forEach(element => {
            var X = element.x;
            var Y = element.y;
            var loss = element.z;

            losses.push(loss)
            dataForHeatMap.push({
                X,
                Y,
                loss
            })
        });

        var color = d3.scaleLinear()
            .range(['blue', 'skyblue', 'red'])
            .domain([d3.min(losses), (d3.min(losses) + d3.max(losses)) / 2, d3.max(losses)])

        svg.selectAll()
            .data(dataForHeatMap)
            .enter()
            .append("rect")
            .attr("x", function (d) {
                return xScale(d.X)
            })
            .attr("y", function (d) {
                return yScale(d.Y)
            })
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .style("fill", function (d) {
                return color(d.loss)
            })
            .on("mouseover", function (d) {
                showHeatmapTooltip(d.X, d.Y, d.loss)
            })
            .on("mousemove", moveTooltip)
            .on("mouseout", hideTooltip)
    }

    // Toggle between crosssection and heatmap
    function toggleHeatMap() {
        d3.select('#crossSectionContainer')
            .style('display', 'none')

        d3.select('#heatmap')
            .style('display', 'flex')

        d3.select('#heatmap_densenet')
            .style('display', 'none')
        d3.select('#heatmap_resnet')
            .style('display', 'none')
        d3.select('#heatmap_resnet_no_short')
            .style('display', 'none')
        d3.select('#heatmap_vgg')
            .style('display', 'none')

        var selected;

        if (event.target.id === 'densenetDropdown') {
            d3.select('#heatmap_densenet')
                .style('display', 'block')

            selected = 'Densenet'
        }

        if (event.target.id === 'resnetNoShortDropdown') {
            d3.select('#heatmap_resnet_no_short')
                .style('display', 'block')

            selected = 'Resnet No Short'
        }

        if (event.target.id === 'resnetDropdown') {
            d3.select('#heatmap_resnet')
                .style('display', 'block')

            selected = 'Resnet'
        }

        if (event.target.id === 'vggDropdown') {
            d3.select('#heatmap_vgg')
                .style('display', 'block')

            selected = 'VGG'
        }

        d3.select('#heatMapButton')
            .style('background-color', '#238b45')
            .attr('value', 'Heatmap (' + selected + ')')

        d3.select('#crossSectionButton')
            .style('background-color', '#74c476')
    }

    function toggleCrossSection() {
        d3.select('#heatmap')
            .style('display', 'none')

        d3.select('#crossSectionContainer')
            .style('display', 'block')

        d3.select('#crossSectionButton')
            .style('background-color', '#238b45')

        d3.select('#heatMapButton')
            .style('background-color', '#74c476')
    }

    d3.select('#crossSectionButton')
        .on('click', toggleCrossSection)

    d3.select('#densenetDropdown')
        .on('click', toggleHeatMap)
    d3.select('#resnetDropdown')
        .on('click', toggleHeatMap)
    d3.select('#resnetNoShortDropdown')
        .on('click', toggleHeatMap)
    d3.select('#vggDropdown')
        .on('click', toggleHeatMap)

    //adding the plane
    var planeGeo = new THREE.PlaneGeometry(2.5, 2.5);
    var planeMaterial = new THREE.MeshBasicMaterial({
        color: 'orange',
        opacity: 0.4,
        wireframe: true,
        side: THREE.DoubleSide
    });

    var lossPlane = new THREE.Mesh(planeGeo, planeMaterial);
    lossPlane.translateY(-2);
    lossPlane.rotation.x = -Math.PI / 2;

    scene.add(lossPlane);

    function movePlane(offset) {
        lossPlane.translateZ(offset);
    }

    // Slider to interact with cross section
    var slider = document.getElementById("myRange");
    var prevPos = 0;

    slider.oninput = function () {
        drawCrossSection(this.value);
        d3.select('#currentLoss').html(this.value)
        movePlane(this.value - prevPos);

        prevPos = this.value;
    }

    // Title, disclaimer and how to use
    var modal = document.getElementById("modal");

    var infoButton = document.getElementById("infoButton");
    var close = document.getElementById("close");

    infoButton.onclick = function () {
        modal.style.display = "block";
        $('#background').addClass('blur')
    }

    close.onclick = function () {
        modal.style.display = "none";
        $('#background').removeClass('blur')
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
            $('#background').removeClass('blur')
        }
    }

    // Color legend
    var color_scale_loss = d3.scaleLinear()
        .domain([0, 50, 100])
        .range(['blue', 'skyblue', 'red'])

    var defs = d3.select('#lossLegendSVG')
        .append("defs");

    var linearGradient = defs.append("linearGradient")
        .attr('id', 'linear_gradient_L')

    linearGradient
        .attr("x1", "0%")
        .attr("y1", "50%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    linearGradient.selectAll("stop")
        .data(color_scale_loss.range())
        .enter()
        .append("stop")
        .attr("offset", function (d, i) {
            return i / (color_scale_loss.range().length);
        })
        .attr("stop-color", function (d) {
            return d;
        });

    d3.select('#lossLegendSVG')
        .append("rect")
        .attr('id', 'lossLegendBar')



    // Wireframe option
    var wireframe_flag = 0;

    d3.select('#b_wireframe')
        .on('change', function () {
            if (wireframe_flag === 0) {
                for (model in loss_mesh) {
                    if (loss_flag[model] === 1) {
                        scene.remove(loss_mesh[model]);
                        loss_mesh[model].material.wireframe = true;
                        scene.add(loss_mesh[model])
                    }
                    loss_mesh[model].material.wireframe = true;
                }

                wireframe_flag = 1;
            } else {
                for (model in loss_mesh) {
                    if (loss_flag[model] === 1) {
                        scene.remove(loss_mesh[model]);
                        loss_mesh[model].material.wireframe = false;
                        scene.add(loss_mesh[model])
                    }
                    loss_mesh[model].material.wireframe = false;
                }

                wireframe_flag = 0;
            }
        })


    // Auto rotate option
    var auto_rotate_flag = 0;
    d3.select('#b_auto_rotate')
        .on('change', function () {
            if (auto_rotate_flag === 0) {
                controls.autoRotate = true;
                auto_rotate_flag = 1;
            } else {
                controls.autoRotate = false;
                auto_rotate_flag = 0;
            }
            controls.update();
        })

    d3.select('#reset')
        .on('click', function () {
            camera.position.set(3, -2.15, -3);
        })

    // Tooltip for the 3D surface
    function onMouseMove(event) {

        var bounds = event.target.getBoundingClientRect();
        var x = event.clientX - bounds.left;
        var y = event.clientY - bounds.top;
        $("#tooltip").text("");
        $("#tooltip").position({
            my: "left+3 bottom-3",
            of: event,
            collision: "fit"
        });

        mouse.x = (x / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(y / renderer.domElement.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        var intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
            var x = intersects[0].point.x
            var y = intersects[0].point.y
            var z = intersects[0].point.z

            if ((x >= -1 && x <= 1) && (z >= -1 && z <= 1))
                $("#tooltip").text('x = ' + parseFloat(x).toFixed(2) + ' y = ' + parseFloat(z).toFixed(2) + ' loss = ' + (parseFloat(y + 2).toFixed(2)));
        }
    }

    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    document.addEventListener('mousemove', onMouseMove, false);

    function reload() {
        requestAnimationFrame(reload);
        controls.update();
        renderer.render(scene, camera);
    }
    reload();
});