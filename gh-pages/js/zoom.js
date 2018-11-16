var zoom = (function ($) {
    var selectors = {
            window: window,
            body: 'body',
            wrapper: '.wrapper',
            scene: '.scene',
            depth: '.depth',
            anchors: 'a[href^="#"]'
        },
        classes = {
            activeAnchor: 'anchor--active',
            pointer: 'scene--pointer'
        },
        canvas, context, layers = [],
        imagePath = 'images/scene/',
        totalImages, loaded = 0,
        tiltStart = 2000,
        speed = 1000,
        backgrounds = [
            ['', ['#165177', '#e3fbfc', 0.5],
                [0, 0, 5500], 1, [-150, 100]
            ],
            ['', ['#03243b', '#65a4be', 0.5],
                [0, 0, 5000], 1, [300, 1900]
            ],
            ['space.jpg', [],
                [0, 0, 4500], 1, [1900, 2500, false, 0.3]
            ]
        ],
        images = [
            ['logo.png', [0, 0, 2500, false, true], 1, [2200, 2221]],
            ['s3-back.png', [0, 0, 2900, true], 3.63, [-2500, 2000]],
            ['s3-mid.png', [0.075, 0, 2400, true], 2.5, [-2000, 2000]],
            ['s2-mid.png', [-0.47, 0, 1750], 1.84, [549, 550]],
            ['clouds.png', [-0.7, 0.47, 1650], 1.4, [1800, 1900, true]],
            ['s2-front.png', [0.3, 0, 1480], 1.7],
            ['s1-back.png', [0.09, 0.045, 1100], 1.6, [119, 120]],
            ['clouds.png', [0, 0.1, 1050], 1.8, [1300, 1450, true]],
            ['s1-mid.png', [0.2, 0, 800], 1.55, [99, 100]],
            ['s1-front.png', [-0.04, 0, 590], 1.5],
            ['book.png', [0, 0, 0], 1, [460, 490, true]],
            ['book-logo.png', [0, 0, 0], 1, [460, 490, true]]
        ],
        content = {
            'start': [0.3, 0.3, 0],
            'about': [0.3, 0.3, 500],
            'team': [0.3, 0.3, 1000],
            'portfolio': [0.3, 0.3, 1500],
            'contact': [0.3, 0.3, 2000],
            'end': [0, 0, 2500]
        },
        points = [
            ['start.png', undefined, true, false, [0.08, 0.14, -1, -0.04, 0.24], 'about'],
            ['about.png', 'about', true, true, [-0.2, 0, 500, -0.14, 0.11]],
            ['team.png', 'team', false, false, [0.14, 0.12, 1000, 0.1, 0.16]],
            ['portfolio.png', 'portfolio', true, false, [-0.18, 0.2, 1500, -0.14, 0.25]],
            ['contact.png', 'contact', false, true, [0.2, 0.1, 2000, 0.12, 0.12]]
        ],
        dimensions = {
            fov: 500,
            totalHeight: 2500,
            pixelRatio: window.devicePixelRatio > 1 ? 1.6 : 1,
            points: {
                width: 60,
                outline: 2.8,
                xAngle: 0.5,
                yAngle: 0.86,
                progress: 0,
                label: {
                    width: 120,
                    height: 40
                }
            }
        },
        animate = false,
        enabled = false,
        offsetZ = 0,
        currentLayer, nodes, controller;

    function setupCanvas() {
        controller = new ScrollMagic();
        canvas = document.getElementById("scene-canvas");
        context = canvas.getContext('2d');
        setDimensions();
        totalImages = images.length +
            points.length;
        for (var x = 0; x < backgrounds.length; x++) {
            if (backgrounds[x][0] !== '') {
                totalImages++;
            }
        }
        for (var x = 0; x < images.length; x++) {
            var layer = new Image();
            layer.src = imagePath + images[x][0];
            createLayer(layer, 'image', images[x][1], images[x][2], images[x][3]);
        }
        for (var x = 0; x < backgrounds.length; x++) {
            var type;
            if (backgrounds[x][0] !== '') {
                var layer = new Image();
                layer.src = imagePath + backgrounds[x][0];
                createLayer(layer, 'pattern', backgrounds[x][2], backgrounds[x][3], backgrounds[x][4]);
            } else {
                var layer = {
                    gradient: backgrounds[x][1]
                };
                createLayer(layer, 'gradient', backgrounds[x][2], backgrounds[x][3], backgrounds[x][4]);
            }
        }
        for (var x = 0; x < points.length; x++) {
            var layer = new Image();
            layer.ltr = points[x][2];
            layer.light = points[x][3];
            layer.modal = points[x][1];
            layer.targetLayer = points[x][5];
            layer.display = points[x][4][2] - (dimensions.fov * 0.6);
            layer.src = imagePath + points[x][0];
            createLayer(layer, 'point', points[x][4]);
        }
    }

    function setDimensions() {
        var windowWidth = nodes.window.width(),
            windowHeight = nodes.wrapper.outerHeight(),
            width, height;
        if (windowWidth < windowHeight * (16 / 9)) {
            width = windowHeight * (16 / 9);
            height = windowHeight;
        } else {
            width = windowWidth;
            height = windowWidth / (16 / 9);
        }
        nodes.scene.css({
            'width': width + 'px',
            'height': height + 'px',
            'margin': '-' + (height / 2) + 'px 0 0 -' + (width / 2) + 'px'
        });
        dimensions.width = canvas.width = nodes.scene.width() * dimensions.pixelRatio;
        dimensions.height = canvas.height = nodes.scene.height() * dimensions.pixelRatio;
        dimensions.halfWidth = dimensions.width / 2;
        dimensions.halfHeight = dimensions.height / 2;
        nodes.depth.css('height', (dimensions.totalHeight + nodes.window.height()) + 'px');
        if (utils.isMobile()) {
            dimensions.points.width = 0;
            dimensions.points.outline = 0;
            dimensions.points.label.width = 0;
            dimensions.points.label.height = 0;
        } else {
            dimensions.points.width = 0;
            dimensions.points.outline = 0;
            dimensions.points.label.width = 0;
            dimensions.points.label.height = 0;
        }
    }

    function setupEvents() {
        nodes.window.on('scroll', throttledRender);
        nodes.window.on('resize', function () {
            setDimensions();
            throttledRender();
        });
        window.setInterval(animateScene, 1000 / 30);
        nodes.anchors.on('click', function (event) {
            var anchor = $(this),
                target = anchor.attr('href').replace('#', ''),
                modal = anchor.data('modal');
            if (target.length > 0) {
                $.publish('/page/closeAll');
                scrollTo(target, modal);
                event.stopPropagation();
                event.preventDefault();
            }
        });
        nodes.scene.on('mousemove', throttledSetCursor);
        nodes.scene.on('click', clickPoint);
        $.subscribe('/page/closeAll', pauseAnimation);
    }

    function pauseAnimation() {
        animate = false;
    }

    function scrollTo(id, modal) {
        var targetZ = content[id][2],
            speed = Math.abs(targetZ - -offsetZ) / dimensions.fov;
        if (utils.isMobile()) {
            $.publish('/closeAll');
            nodes.body.animate({
                scrollTop: targetZ
            }, speed * 1000, function () {
                if (modal) {
                    $.publish('/modals/show', [modal]);
                }
            });
        } else {
            TweenMax.to(nodes.window, speed, {
                scrollTo: {
                    y: targetZ
                },
                onStart: function () {
                    $.publish('/closeAll');
                },
                onComplete: function () {
                    if (modal) {
                        $.publish('/modals/show', [modal]);
                    }
                }.bind(modal)
            });
        }
    }

    function getTilt(offsetZ) {
        var tilt = -offsetZ - tiltStart;
        tilt = tilt < 0 ? 0 : Math.pow(tilt, 1.3);
        return tilt;
    }
    var throttledRender = _.throttle(render, 1000 / 30);

    function render() {
        offsetZ = -nodes.window.scrollTop();
        offsetZ = offsetZ <= 0 ? offsetZ : 0;
        tilt = getTilt(offsetZ);
        throttledSetLayer();
        context.clearRect(0, 0, dimensions.width, dimensions.height);
        var layer, opacity;
        for (var x = 0; x < layers.length; x++) {
            layer = positionLayer(layers[x], offsetZ, tilt);
            if (layer.fade) {
                if (-offsetZ >= layer.fade[0] && -offsetZ <= layer.fade[1]) {
                    opacity = (-offsetZ - layer.fade[0]) / (layer.fade[1] - layer.fade[0]);
                } else if (-offsetZ < layer.fade[0]) {
                    opacity = 0;
                } else if (-offsetZ > layer.fade[1]) {
                    opacity = 1;
                }
                if (layer.fade[2]) {
                    opacity = 1 - opacity;
                }
                context.globalAlpha = opacity;
            } else {
                context.globalAlpha = 1;
            }
            if (layer.render && layer.width > 0 && context.globalAlpha > 0) {
                switch (layer.type) {
                    case 'image':
                        context.drawImage(layer, layer.coords[0], layer.coords[1], layer.width, layer.height);
                        break;
                    case 'pattern':
                        var pattern = context.createPattern(layer, 'repeat'),
                            parallax = dimensions.height * -(-offsetZ - layer.fade[0]) / (layer.fade[1] - layer.fade[0]) * layer.fade[3] - (tilt * 0.1);
                        parallax = dimensions.height * -(tilt / getTilt(-dimensions.totalHeight)) * layer.fade[3];
                        context.fillStyle = pattern;
                        context.save();
                        context.translate(0, -parallax);
                        context.fillRect(layer.coords[0], layer.coords[1] - dimensions.height, layer.width, layer.height * 2);
                        context.restore();
                        break;
                    case 'gradient':
                        var gradient = context.createLinearGradient(0, 0, 0, layer.height * layer.gradient[2]);
                        gradient.addColorStop(0, layer.gradient[0]);
                        gradient.addColorStop(1, layer.gradient[1]);
                        context.fillStyle = gradient;
                        context.fillRect(layer.coords[0], layer.coords[1], layer.width, layer.height);
                        break;
                    case 'point':
                        drawPoint(context, layer);
                        break;
                }
            }
        }
    }

    function drawPoint(context, point) {
        var scale = dimensions.fov / (dimensions.fov + point.baseCoords[2] + offsetZ);
        var side = point.width / 2;
        var x = point.coords[0] + side / 2;
        var y = point.coords[1];
        var thickness = dimensions.points.outline * scale * dimensions.pixelRatio;
        if (utils.isMobile()) {
            x = point.coords[2] + side / 2;
            y = point.coords[3];
        }
        var textX = (point.ltr ? x + side + (side * dimensions.points.xAngle) : x - (side * dimensions.points.xAngle) - (dimensions.points.label.width * scale * dimensions.pixelRatio)) + (10 * scale * dimensions.pixelRatio * (point.ltr ? 1 : -1)),
            active = -offsetZ >= point.display;
        if (utils.isMobile()) {
            point.clickTarget = [point.coords[2], point.coords[2] + point.width, point.coords[3], point.coords[3] + point.height];
        } else {
            point.clickTarget = [point.coords[0], point.coords[0] + point.width, point.coords[1], point.coords[1] + point.height];
        }
        if (scale < 0) {
            return;
        }
        if (active) {
            if (utils.isMobile()) {
                point.clickTarget[0] = (textX <= point.coords[2] ? textX : point.coords[2]);
                point.clickTarget[1] = textX >= point.coords[2] ? textX + (dimensions.points.label.width * scale * dimensions.pixelRatio) : point.clickTarget[1];
            } else {
                point.clickTarget[0] = (textX <= point.coords[0] ? textX : point.coords[0]);
                point.clickTarget[1] = textX >= point.coords[0] ? textX + (dimensions.points.label.width * scale * dimensions.pixelRatio) : point.clickTarget[1];
            }
            var highlightOpacity = (-offsetZ - point.display) / 100;
            highlightOpacity = highlightOpacity <= 1 ? highlightOpacity : 1;
            context.fillStyle = '#00d8ff';
            context.globalAlpha = highlightOpacity <= 0.6 ? highlightOpacity : 0.6;
            if (point.hover) {
                dimensions.points.progress = (dimensions.points.progress % 25) + 1;
                context.globalAlpha = context.globalAlpha * (1 - dimensions.points.progress / 25);
            }
            var hThickness = (12 - (8 * (point.hover ? (25 - dimensions.points.progress) / 25 : 1))) * scale * dimensions.pixelRatio,
                hX = x - (hThickness * dimensions.points.xAngle),
                hY = y - (hThickness * dimensions.points.yAngle),
                hSide = side + hThickness;
            context.beginPath();
            context.moveTo(hX, hY);
            context.lineTo(hX - (hSide * dimensions.points.xAngle), hY + (hSide * dimensions.points.yAngle));
            context.lineTo(hX, hY + (hSide * dimensions.points.yAngle * 2));
            context.lineTo(hX + hSide, hY + (hSide * dimensions.points.yAngle * 2));
            context.lineTo(hX + hSide + (hSide * dimensions.points.xAngle), hY + (hSide * dimensions.points.yAngle));
            context.lineTo(hX + hSide, hY);
            context.closePath();
            context.fill();
            context.globalAlpha = highlightOpacity;
            context.drawImage(point, textX, y + (side * dimensions.points.yAngle) - (12 * scale * dimensions.pixelRatio), dimensions.points.label.width * scale * dimensions.pixelRatio, dimensions.points.label.height * scale * dimensions.pixelRatio);
        }
        context.globalAlpha = 1;
        context.fillStyle = point.light ? '#fff' : '#000';
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + side, y);
        context.lineTo(x + side + (side * dimensions.points.xAngle), y + (side * dimensions.points.yAngle));
        context.lineTo(x + side, y + (side * dimensions.points.yAngle * 2));
        context.lineTo(x, y + (side * dimensions.points.yAngle * 2));
        context.lineTo(x - (side * dimensions.points.xAngle), y + (side * dimensions.points.yAngle));
        context.lineTo(x, y);
        x += (thickness * dimensions.points.xAngle), y += (thickness * dimensions.points.yAngle), side -= thickness;
        context.lineTo(x, y);
        context.lineTo(x - (side * dimensions.points.xAngle), y + (side * dimensions.points.yAngle));
        context.lineTo(x, y + (side * dimensions.points.yAngle * 2));
        context.lineTo(x + side, y + (side * dimensions.points.yAngle * 2));
        context.lineTo(x + side + (side * dimensions.points.xAngle), y + (side * dimensions.points.yAngle));
        context.lineTo(x + side, y);
        context.lineTo(x, y);
        context.closePath();
        context.fill();
        if (!point.targetLayer) {
            var eWidth = dimensions.points.outline * 2 * scale * dimensions.pixelRatio,
                eHeight = dimensions.points.outline * 7.5 * scale * dimensions.pixelRatio,
                taper = dimensions.points.outline * 0.4 * scale * dimensions.pixelRatio;
            x += (side / 2) - (eWidth / 2);
            y += side - (eHeight * 0.9);
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x + eWidth, y);
            context.lineTo(x + eWidth - taper, y + eHeight);
            context.lineTo(x + taper, y + eHeight);
            context.closePath();
            context.fill();
            context.arc(x + (eWidth / 2), y + eHeight + eWidth, eWidth * 0.6, 0, 2 * Math.PI, false);
            context.fill();
        } else {
            var eWidth = dimensions.points.outline * 1.7 * scale * dimensions.pixelRatio,
                eHeight = dimensions.points.outline * 4 * scale * dimensions.pixelRatio;
            x += (side / 2);
            y += (side / 2) + (eWidth / 2);
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x + (eHeight * 2 * dimensions.points.xAngle), y + (eHeight * dimensions.points.yAngle));
            context.lineTo(x + (eHeight * 2 * dimensions.points.xAngle), y + (eHeight * dimensions.points.yAngle) + eWidth);
            context.lineTo(x, y + eWidth);
            context.lineTo(x - (eHeight * 2 * dimensions.points.xAngle), y + (eHeight * dimensions.points.yAngle) + eWidth);
            context.lineTo(x - (eHeight * 2 * dimensions.points.xAngle), y + (eHeight * dimensions.points.yAngle));
            context.closePath();
            context.fill();
        }
    }

    function positionLayer(layer, offsetZ, tilt) {
        var scale = dimensions.fov / (dimensions.fov + layer.baseCoords[2] + offsetZ);
        layer.render = scale > 0;
        switch (layer.type) {
            case 'image':
                layer.width = dimensions.width * scale * layer.baseScale;
                layer.height = dimensions.height * scale * layer.baseScale + (layer.baseCoords[3] ? tilt * 0.2 : 0);
                break;
            case 'point':
                layer.width = dimensions.points.width * scale * dimensions.pixelRatio;
                layer.height = dimensions.points.width * scale * dimensions.pixelRatio * dimensions.points.yAngle;
                break;
            case 'pattern':
            case 'gradient':
                layer.width = dimensions.width;
                layer.height = dimensions.height;
                break;
        }
        layer.coords = [dimensions.halfWidth - (layer.width / 2) + (layer.baseCoords[0] * dimensions.width * scale), dimensions.halfHeight - (layer.height / 2) + (layer.baseCoords[1] * dimensions.height * scale) + (tilt * scale)];
        if (layer.type === 'point') {
            layer.coords[2] = dimensions.halfWidth - (layer.width / 2) + (layer.baseCoords[3] * dimensions.width * scale);
            layer.coords[3] = dimensions.halfHeight - (layer.height / 2) + (layer.baseCoords[4] * dimensions.height * scale) + (tilt * scale);
        }
        if (layer.baseCoords[4] && layer.type !== 'point') {
            layer.coords[1] = dimensions.halfHeight - (layer.height / 2) - (1 - (tilt / getTilt(-dimensions.totalHeight))) * dimensions.height;
        }
        if (layer.type === 'pattern' || layer.type === 'gradient') {
            layer.coords = [0, 0];
        }
        return layer;
    }

    function createLayer(layer, type, coords, scale, fade) {
        layer.type = type;
        layer.baseCoords = coords;
        layer.baseScale = scale ? scale : 1;
        layer.fade = fade;
        layer = positionLayer(layer, 0, 0);
        layers.push(layer);
        if (type === 'image' || type === 'pattern' || type === 'point') {
            layer.onload = onloadHandler;
        }
    }

    function onloadHandler() {
        loaded++;
        if (loaded == totalImages) {
            layers.sort(function (a, b) {
                return b.baseCoords[2] - a.baseCoords[2];
            });
            render();
            $.publish('/ready');
        }
    }
    var throttledSetLayer = _.throttle(setLayer, 300);

    function setLayer() {
        var key, z;
        for (key in content) {
            z = content[key][2];
            if (z >= -offsetZ - (dimensions.fov / 2) && z <= -offsetZ + (dimensions.fov / 2)) {
                currentLayer = key;
            }
        }
        $('.' + classes.activeAnchor).removeClass(classes.activeAnchor);
        $('a[href="#' + currentLayer + '"]').addClass(classes.activeAnchor);
    }

    function getPointTarget(event) {
        var x = (event.pageX + -nodes.scene.offset().left) * dimensions.pixelRatio,
            y = (event.pageY + -nodes.scene.offset().top) * dimensions.pixelRatio,
            target = false;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].type === 'point') {
                if (layers[i].clickTarget && x >= layers[i].clickTarget[0] && x <= layers[i].clickTarget[1] && y >= layers[i].clickTarget[2] && y <= layers[i].clickTarget[3]) {
                    layers[i].hover = true;
                    target = layers[i];
                } else {
                    layers[i].hover = false;
                }
            }
        }
        if (!target) {
            dimensions.points.progress = 0;
        }
        return target;
    }
    var throttledSetCursor = _.throttle(setCursor, 1000 / 30);

    function setCursor(event) {
        var target = getPointTarget(event);
        animate = target !== false;
        nodes.scene.toggleClass(classes.pointer, target !== false);
    }

    function clickPoint(event) {
        var target = getPointTarget(event);
        if (target !== false) {
            animate = false;
            scrollTo(target.targetLayer ? target.targetLayer : target.modal, target.modal);
        }
    }

    function animateScene() {
        if (animate) {
            throttledRender();
        }
    }
    return {
        init: function () {
            nodes = utils.createNodes(selectors);
            setupCanvas();
            setupEvents();
        }
    }
})(jQuery);
$(function () {
    zoom.init();
});