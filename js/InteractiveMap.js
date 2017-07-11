;(function(){    
    "use strict";
    // object: interactiveMap,  основная функция для библиотеки
    function interactiveMap() {
        debuglog("Load interactiveMap v" + version);
    }
    // вывод сообщений дебага
    function debuglog(msg){
        if(!!isDebug) {console.log("Debug: " + msg)};
    }
    
    // вспомогательные переменные
    var version = '0.0.7'    
        ,isDebug = false                    // Хранит флаг дебага,евли включен, то тображает дебаг сообения 
        ,layers                             // Хранит массив слоев
        ,sizeLayers = 0                     // количество слоев, чтобы постоянно не дергать размер
        ,activeLayerId = -1                 // активный слой
        ,sizeLabelCoef = 15                 // кол-во пикселей от точки в право и влево, для создания прямоугольника
        ,height                             // высота карты
        ,width                              // ширина карты
        ,imgPath                            // путь к картинке для отображения
        ,baseTag                            // корневой html элемент карты
        ,settingsMark = []                  // объект настроек точки для карты
        ,showingTooltip                     // Хранит элемент подсказки для Point
        ,paginator                          // Хранит пагинатор для слоев
        ,galery                             // Хранит галерею
        ,settingGaleryImg                   // Хранит настройки для отображени галереи
        ,isShowCaption = 0                  // Хранит значение отображать шапку(1) или нет(0)
        ,pointDesc                          // Хранит класс работы по отображению описания точки
        ,activeDescEl                       // Хранит активный элемент описания точки
        ,preview                            // Хранит объект отвечающий за предварительнй просмотр
        ;
    // TODO: вынести всё по максиму в переменные
    
        // Object: Point, Объединяет координаты точки
        function Point(x, y, name, src, desc) {
            this.x = x;
            this.y = y;
            this.name = name;
            this.src = src || '',
            this.desc = desc || '';
        }
    
        // Object: Mark, настройки иконки для карты
        function Mark(icon, width, height, marginX, marginY){
            this.icon = icon;               // путь к файлу
            this.sizeX = width;             // ширина
            this.sizeY = height;            // высота
            this.marginX = marginX;         // сдвиг по ширине, для поиска центра
            this.marginY = marginY;         // сдвиг по высоте
        }
        // Настройки для отображения фотограифй в галерее
        function GaleryImage(width, height){
            this.width = width;
            this.height = height;            
        }

        // Object: Layers, объеденяет места(point), расположенные на карте, объединенные по смыслу
        function Layers(name){
            this.name = name;   // Название слоя
            this.layer = [];    // Массив содержащий точки слоя
            this.images = [];   // Массив содержащий фотографии для галереии по слоям
        }
        // Object: Layers, Добавление точки в слой
        Layers.prototype.addPoint = function(x, y, name, src, desc){
            this.layer.push(new Point(x, y, name, src, desc));
        }
        // Object: Layers, Удаление точки по индексу
        Layers.prototype.delPoint = function(index){
            var d = this.layer[index];
            if (d != undefined){
                delete(this.layer[index])
                sizeLayers -=1;
            }
        }
        // Object: Layers, out: объект точка по заданному индексу
        Layers.prototype.getPoint = function(index){
                return this.layer[index];            
        }
        // Object: Layers, наполнение массива фотографий для активного слоя
        Layers.prototype.addImage = function(img){
            this.images.push(img);
        }
        
        // Object: Paginator, переключатель слоев
        function Paginator(id, size){      
            var me = this;                              // хранит ссылку на объект Paginator
            this.timerId;                                // хранит ссылку на таймер для автосмены слоев
            this.id = id;
            this.size = size;
//            this.iii = 0;
            
            // Object: Paginator, переключает слой
            this.nextLayer = function(layerId, el){
                setActiveLayer(Number(layerId));
                renderMark();
                galery.show();
                me.setActive(el);
            }
            // Object: Paginator, out: {layerId: номер, elem: елемент}, определяет следующий активный слой и элемент
            this.getNextLayerId = function(layerNow){
                var layerId = layerNow || activeLayerId+1;
                var ul = document.getElementsByClassName('imap-paginator'); 
                var obj = {};
                Array.prototype.forEach.call(ul, function(e) {
                    var li = e.getElementsByTagName("li"),
                        actId = (layerId>=sizeLayers ? Number(0) : layerId); // Следующий слой
                    Array.prototype.forEach.call(li, function(e) {
                        var layerId = e.getAttribute('data-layer-id'),
                            lid = Number(layerId);
                        if(lid==actId){
                            obj = {layerId: actId, elem: e};
                            return;
                        }
                    });
                    if(_size(obj)>0){return;}
                });   
                return obj;
            }
        };
        // Object: Paginator, создание пагинатора
        Paginator.prototype.create = function (){
            let me = this;
            _clearPaginator("imap-paginator");
            var ul = document.createElement('ul');            
            ul.setAttribute("id","imap-paginator-"+this.id);                     
            ul.className = "imap-paginator";
            layers.forEach(function(item, i, layer){
                var li = document.createElement('li');
                if(i == activeLayerId){
                    li.className = "active";
                }
                li.setAttribute('data-layer-id', i);
                ul.appendChild(li);
                me.setListener(li);
            });
            var el = baseTag.appendChild(ul);  
            this.setAlign((width/2 - _size(layers)/2), (height - this.size));
            el.style.left = this.x + 'px';
            el.style.top = this.y + 'px';
        }
        // Object: Paginator, устанавливает координаты отображения 
        Paginator.prototype.setAlign = function(x,y){
            this.x = x;
            this.y = y;
        };        
        // Object: Paginator, устанавливает слушателей
        Paginator.prototype.setListener = function(el){
                var me = this,
                    elem = el;
                document.onclick  = function(el) {
                    var target = el.target;
                    var layerId = target.getAttribute('data-layer-id');
                    if(!layerId){return}
                    if(layerId==activeLayerId){return}
                    me.nextLayer(layerId, target);
                }
        };
        // Object: Paginator, устанавливает класс для активной страницы
        Paginator.prototype.setActive = function(el){
            var ul = document.getElementsByClassName('imap-paginator');
//            var li = ul.getElementsByTagName("li");
            Array.prototype.forEach.call(ul, function(e) {
                var li = e.getElementsByTagName("li");                
                Array.prototype.forEach.call(li, function(e) {
                    e.classList.remove("active");
                });
            });
            el.classList.add("active");            
        };
        // Object: Paginator, запускает автосмену слоев, время задается при помощи tms
        Paginator.prototype.start = function(tms){
            var me = this;
            this.timerId = setTimeout(function nextLayer() {
                var obj = me.getNextLayerId();
                me.nextLayer(obj.layerId, obj.elem);
                //if(me.timerId){me.stop(); return;}
                me.timerId = setTimeout(nextLayer, tms);
            }, tms);
        }
        // Object: Paginator, останавливает автосмену слоев
        Paginator.prototype.stop = function(){
            clearTimeout(this.timerId);
            debuglog('остановлено автопереключение')
        }
        // Object: Paginator, отображает заданный слой
        Paginator.prototype.showLayer = function(layerId){
            this.getNextLayerId(layerId);
            debuglog('отображаем слой ['+layerId+']');
        }
        
        // Object: Galery, Создает новую галерею
        function Galery(tag, settings){
            this.galeryTag = document.getElementById(tag);
            if(this.galeryTag == null){
                return false;
            }
            if(settings==undefined){
                settingGaleryImg = new GaleryImage(225, 166);
            }else{
                settingGaleryImg = new GaleryImage(settings.width||225, settings.height||166);
            }
            debuglog("создана галерея");           
        }
        // Object: Galery, отображает фото
        Galery.prototype.show = function(index){
            if(index===undefined){
                _clearGalery();
                var div = document.createElement('div');
                div.setAttribute("id","imap-galery-img-1");                             
                div.style.height = height+'px';            
                div.className = "imap-galery-img";             
                var elDiv = this.galeryTag.appendChild(div);
                let me = this;
                layers[activeLayerId].images.forEach(function(item, i, layer){
                    if(i>=3){return;}
                    var img = document.createElement('img');
                    img.src = item.src;
                    img.setAttribute('data-id', i);
                    img.style.width = settingGaleryImg.width+'px';
                    img.style.height = settingGaleryImg.height+'px';
                    var elImg = elDiv.appendChild(img);             
                    me.addListener(img);
                });
                return true;
            }
            // TODO: реализовать отображение одного фото
            return true;
        }
        // Object: Galery, устанавливает слушателей
        Galery.prototype.addListener = function(img){
            img.addEventListener("click", function(){
                _setDisplay('block', "preview-foto");
                preview.setImg(img.getAttribute('data-id'));
            });
        }
    
        // Object: PointDescriptin, класс для работы с описанием точки
        function PointDescription(tag){
            this.tagDesc = document.getElementById(tag);
        }
        // Object: PointDescriptin, создание списка
        PointDescription.prototype.createList = function(){
            let ul = document.createElement('ul');
            ul.className  ='imap-desc-list';
            let points = layers[activeLayerId].layer;   
            points.forEach(function(p,i,points){
                    if(p.desc!=''){
                        let li = document.createElement('li');
                        li.innerHTML = p.desc;
                        li.id = 'imap-desc-li-'+i;
                        ul.appendChild(li);
                    }
            });
            this.tagDesc.appendChild(ul);
        }
        PointDescription.prototype.clearList = function(){
            this.tagDesc.innerHTML = '';
        }
    
        // Object Preview, Предварительный просмотр фото из галереи
        function Preview(){
            this.tag = "preview-foto";
            this.imgEl = document.getElementById("preview-foto_img");
            _setDisplay("none", this.tag);
            this.addListener();
        }
        // Object Preview, устанавливаем слушателей на элементы управления
        Preview.prototype.addListener = function(){
            let closeEl = document.getElementsByClassName("preview-foto-close")[0];             
            closeEl.addEventListener("click", function(){
                _setDisplay('none', preview.tag);
            });
            document.addEventListener("mouseup", function(e){
                if(e.target.className=='preview-foto'){
                    _setDisplay('none', preview.tag);
                }
            })
            let nextEl = document.getElementsByClassName("preview-foto-next")[0];             
            nextEl.addEventListener("click", function(){
                preview.next();
            });
            let prevEl = document.getElementsByClassName("preview-foto-prev")[0];             
            prevEl.addEventListener("click", function(){
                preview.prev();
            });
            let imgEl = document.getElementsByClassName("preview-foto_img")[0];             
            imgEl.addEventListener("click", function(){
                preview.next();
            });
        }
        // Object Preview, устанавливает текущее фото
        Preview.prototype.setImg = function(idImg){  
            this.imgEl.src = layers[activeLayerId].images[idImg].src;
            this.imgEl.setAttribute("data-id", idImg);
            let descEl = document.getElementsByClassName("preview-foto__desc")[0];
            if(descEl){
                descEl.innerHTML = layers[activeLayerId].images[idImg].text;
            }
        }        
        // Object Preview, переключение фото в перед
        Preview.prototype.next = function(){
            const imgId = this.imgEl.getAttribute("data-id");
            const newId = layers[activeLayerId].images.length != Number(imgId)+1 ? Number(imgId) + 1 : 0;
            this.setImg(newId);
        }
        // Object Preview, переключение фото в назад
        Preview.prototype.prev = function(){
            const imgId = this.imgEl.getAttribute("data-id");
            const newId = 0 <= Number(imgId)-1 ? Number(imgId) - 1 : layers[activeLayerId].images.length-1;
            this.setImg(newId);
        }
    
    // Object: interactiveMap, выставляет свойство display для заданого елемента
    function _setDisplay(state, tag){        
            let previewEl = document.getElementsByClassName(tag)[0];            
            previewEl.style.display = state;
    }
    
    // Object: interactiveMap, out: Размер передданого объекта
    function _size(collection) {
        return Object.keys(collection).length;
    }
    
    // Object: interactiveMap, добавляет фотографии на слой из объекта
    function _addImages(data){
        if(!layers){return;} 
        if(typeof data == 'object'){
            if(!data.images){return}
            data.images.forEach(function(item , key, images){
                let layerId = item.layerId;
                if(!item.items){return}
                item.items.forEach(function(img){
                    if(!layers[layerId]){return}
                        layers[layerId].addImage(img);                                            
                })
            })
        }
    }
    
    // Object: interactiveMap, out: true если успешно. Создает фон для карты c заданными размерами и рисует в tag
    function createMap(w, h, img, tag){
        
        width = w;
        height = h;
        img = img;
        
        baseTag = document.getElementById(tag);
        if(baseTag == null){
            return false;
        }
        baseTag.style.width = width + 'px';
        baseTag.style.height = height + 'px';
        baseTag.style.background = "url(" + img + ") no-repeat";
        baseTag.style.backgroundSize = "contain";
        baseTag.style.position = "relative";
                
        return true;
    }
    
    // Object: interactiveMap, создает список описания к точкам
    function createPointDesc(tag){
        pointDesc = new PointDescription(tag);
        //pointDesc.createList();
    }
    function _showPointDesc(){
        pointDesc.clearList();
        pointDesc.createList();
    }
    // Object: interactiveMap, создает галерею
    function createGalery(tag, setting){
        galery = new Galery(tag, setting);
        if(galery!=null||galery!=undefined){
            return true;
        }
        else{
            return false;
        }
    }
                
    // Object: interactiveMap, заполняет всю или выводит нужное фото
    function showGalery(index){
        if(!galery){return}
        galery.show(index);
    }
    
    // Object: interactiveMap, 
    function createPreview(){
        preview = new Preview();
    }
                
    // Oblect: interactiveMap, устанавливает настройки по умолчанию для точки
    function _defaultSettingsMark(){
        settingsMark[activeLayerId] = new Mark('img/map-label.png', '50px', '50px', 25, 45);
        debuglog("Установлены настройки по умолчанию для отображения Point");
    }
    
    // Oblect: interactiveMap, устанавливает настройки для точки на активном слое
    function setSettingsMark(icon, width, height, marginX, marginY){
        settingsMark[activeLayerId] = new Mark(icon, width, height, marginX, marginY);
        debuglog("Установлены настройки для отображения Point");
    }
    
    // Oblect: interactiveMap, добавляет к точке подсказку
    function _addListenerbyMark(e){
        document.onmouseover = function(e) {
            var target = e.target;
            
            let descid = target.getAttribute('data-descid');
            if(!!descid){
                activeDescEl = document.getElementById('imap-desc-li-'+descid);
                if(!!activeDescEl){
                    activeDescEl.className = 'active';
                }
            }
            
            var tooltip = target.getAttribute('data-tooltip');
            if (!tooltip) return;
            
            let tooltipElem = document.createElement('div');
            tooltipElem.className = 'tooltip';
            
            //получаем точку для оформления подсказки
            let point = getPoint(descid);
            if(!point){return}
            
            if(point.src!=''){
                let img = document.createElement('img');
                img.src = point.src;
                img.className = 'tooltip__img';
                tooltipElem.appendChild(img);
            }
            
            let h = document.createElement('h3');
            h.className = 'tooltip__h3';
            h.innerHTML = point.name;
            
            let p = document.createElement('p');
            p.className = 'tooltip__p';
            p.innerHTML = point.desc;
            
            tooltipElem.appendChild(h);
            tooltipElem.appendChild(p);
            
//            tooltipElem.innerHTML = tooltip;
            document.body.appendChild(tooltipElem);

            var coords = target.getBoundingClientRect();

            var left = coords.left + (target.offsetWidth - tooltipElem.offsetWidth) / 2;
            if (left < 0) left = 0; // не вылезать за левую границу окна

            var top = coords.top - tooltipElem.offsetHeight - 5;
            if (top < 0) { // не вылезать за верхнюю границу окна
            top = coords.top + target.offsetHeight + 5;
            }

            tooltipElem.style.left = left + 'px';
            tooltipElem.style.top = top + 'px';

            showingTooltip = tooltipElem;
        };

        document.onmouseout = function(e) {
            if(!!activeDescEl){activeDescEl.className = '';}
            
            if (showingTooltip) {
                document.body.removeChild(showingTooltip);
                showingTooltip = null;
            }
        }
    }
    
    // Object: interactiveMap, Функция задержка
    function _delay(f, ms) {
        return function() {
            var savedThis = this;
            var savedArgs = arguments;

            setTimeout(function() {
                    f.apply(savedThis, savedArgs);
                }, ms);
            };
    }
    
    // Object: interactiveMap, отображение шапки слоя
    function _showCaption(){
        if(!isShowCaption){return;}
        let captionEl = document.getElementById("imap-caption");
        if(!captionEl){
            captionEl = document.createElement('div');
//            captionEl.style.zIndex='100';
            captionEl.style.position = 'absolute';
            captionEl.id = "imap-caption";     
            //captionEl.style.left = '100px';
            //captionEl.style.top = '10px';
            let elDiv = baseTag.appendChild(captionEl);
            debuglog("Создана шапка карты, class=imap-caption");
        }
        captionEl.innerHTML = layers[activeLayerId].name;
    }
    
    // Object: interactiveMap, Очищаем слой для перерисовки
    function _clearLayer(){
        var el = baseTag.getElementsByClassName("imap-point-block");                
        Array.prototype.forEach.call(el, function(e) {
            baseTag.removeChild(e)
        });
                  
    }
    
    // Object: interactiveMap, Очищаем галерею
    function _clearGalery(){
        var el = galery.galeryTag.getElementsByClassName("imap-galery-img");                
        Array.prototype.forEach.call(el, function(e) {
            galery.galeryTag.removeChild(e);
        });
    }
    // Object: interactiveMap, Очищаем пагинатор
    function _clearPaginator(tagname){
        var el = baseTag.getElementsByClassName(tagname);                
        Array.prototype.forEach.call(el, function(e) {
            baseTag.removeChild(e);
        });
    }
    
    // Oblect: interactiveMap, out: true если успешно. Создание меток на карте
    function renderMark(){
        if(settingsMark[activeLayerId]===undefined){
            _defaultSettingsMark();             // ставим настройки вида по умолчанию
        }
        _clearLayer();                          // Очищаем слой
        var div = document.createElement('div');
        // TODO: сдлеать возможность добавления нескольких блоков одновременно на странице.
        div.className = "imap-point-block";
        var childDiv = baseTag.appendChild(div);
        layers[activeLayerId].layer.forEach(function(item, i, layer){
            var div = document.createElement('div');
            div.setAttribute("id","imap-point-"+i);         
            div.style.width = settingsMark[activeLayerId].sizeX;
            div.style.height = settingsMark[activeLayerId].sizeY;
            div.style.background = "url(" + settingsMark[activeLayerId].icon + ") no-repeat";
            div.style.backgroundSize = "contain";
            div.className = "imap-mark";             
            var el = childDiv.appendChild(div);
            el.style.position = "absolute";
            el.style.left = item.x-settingsMark[activeLayerId].marginX + 'px';
            el.style.top = item.y-settingsMark[activeLayerId].marginY + 'px';
            el.setAttribute('data-tooltip', item.name);
            el.setAttribute('data-descid', i);
            _addListenerbyMark(el);             // Устанавливаем слушателей
        });
        _showCaption();                         // Отображаем шапку слоя
        _showPointDesc();                       // Отображаем описание метки
    }
        
    // Object: interactiveMap, out: Номер активного слоя. Добовляет новый слой
    function _addNewLayer(name){
        if(layers===undefined){
                layers = new Array(new Layers(name));
                activeLayerId = 0;  
                debuglog("Создан пустой слой[" + activeLayerId + "]");
            }else{           
                layers.push(new Layers(name));
                activeLayerId = _size(layers)-1;
                debuglog("Добавлен пустой слой[" + activeLayerId + "]");
            }
        sizeLayers +=1;
        return activeLayerId;
    }
    
    // Object: interactiveMap, Создает слой и если передан объект заполняет.
    function addLayer(data){
        if(typeof data == 'string'){
            _addNewLayer(data);
        }
        if(typeof data == 'object'){
            if(!data.layers){return}
            data.layers.forEach(function(item , key, layers){
                _addNewLayer(item.name);
                if(!item.points){return}
                item.points.forEach(function(point){
                    // TODO: сделать проверку чтобы поля точно были
                    addPoint(point.x || -1000, point.y || -1000, point.name || "", point.src, point.desc);
                })
            })
        }
        return activeLayerId;
    }
    
    // Object: interactiveMap, добвление точки в активный слой
    function addPoint(x,y, name, src, desc){
        try{
            layers[activeLayerId].addPoint(x,y, name, src, desc);    
        }
        catch(err){
            console.log("Error: (interactiveMap.addPoint) The index is outside the array or bad value x, y.");    
        }
    }
    
    // Object: interactiveMap, out: выводит точку index с активного слоя
    function getPoint(index){        
        var point = layers[activeLayerId].getPoint(index);    
        if(point===undefined){
            console.log("Error: (interactiveMap.getPoint) The index active layer is outside the array")
            return new Point(-1, -1);
        }
        return point;
    }
    
    // Object: interactiveMap, out: новый активный слой или -1
    function setActiveLayer(index){
        if(sizeLayers>index && index>=0){            
            activeLayerId = index;
            debuglog("Установлен активный слой[" + activeLayerId + "]");
        }
        return -1;
    }
    
    // Object: interactiveMap, out: текущий активный слой
    function getActiveLayer(){
        return activeLayerId;
    }
    
    // Object: interactiveMap, создает пагинатор для слоев
    function createPaginator(){
        paginator = new Paginator(1, 50);
        paginator.create();
    }
    
    // Object: interactiveMap, запускает автоматичекое переключение слоев (act=0), выключает 1
    function startAutoNextLayer(tms, act){
        if(paginator===undefined){return}
        var tms = tms || 2000,
            act = act || 0;        
        if(act==0){            
            paginator.start(tms);
            debuglog('запущено автопереключение, интервал = ' + tms);
        }else{
            paginator.stop();            
        }
    }
    // Object: interactiveMap, устанавливает флаг отображения шапки слоя
    function setShowCaption(isShow){
        if(isShow>0){
            isShowCaption = 1;
        }else{
            isShowCaption = 0;
        }
    }
    
    // Object: interactiveMap, загрузка JSON
    function _loadJSON(file, callback) {   
        var xhr = new XMLHttpRequest();
        xhr.overrideMimeType("application/json");
        xhr.open('GET', file, false);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status == "200") {
                callback(xhr.responseText);
                }
        };
        xhr.send(null);  
     }
 
    // Object: interactiveMap, заполнение слоев из JSON файла
    function load(patch) {
        paginator.create();
        _loadJSON(patch||'', function(response) {
           try{
                let actual_JSON = JSON.parse(response);
                if(actual_JSON){
                    addLayer(actual_JSON);
                    paginator.create();
                    debuglog('загружен объект');
                }
            }catch(ex){
                debuglog('ошибка парсинга объекта');
            }
        });
    };
    
    // Object: interactiveMap, заполнение массива фото на слоях из JSON файла
    function loadImages(patch) {
        _loadJSON(patch||'', function(response) {
            try{
                let actual_JSON = JSON.parse(response);
                if(actual_JSON){
                    _addImages(actual_JSON);
                    showGalery();
                    debuglog('Галерея загружена и отображена');
                }
            }catch(ex){
                debuglog('ошибка парсинга объекта images');
            }
        });
    };
    // присвоим в interactiveMap функции, которые нужно вынести из модуля
    interactiveMap.addLayer = addLayer;
    interactiveMap.setActiveLayer = setActiveLayer;
    interactiveMap.getActiveLayer = getActiveLayer;
    interactiveMap.addPoint = addPoint;
    interactiveMap.getPoint = getPoint;
    interactiveMap.createMap = createMap;
    interactiveMap.renderMark = renderMark;
    interactiveMap.setSettingsMark = setSettingsMark;
    interactiveMap.createPaginator = createPaginator;
    interactiveMap.startAutoNextLayer = startAutoNextLayer;
    interactiveMap.loadImages = loadImages;
    interactiveMap.createGalery = createGalery;
    interactiveMap.showGalery = showGalery;
    interactiveMap.setShowCaption = setShowCaption;
    interactiveMap.createPointDesc = createPointDesc;
    interactiveMap.load = load;
    interactiveMap.createPreview = createPreview;
                
    // "экспортировать" interactiveMap наружу из модуля
    window.interactiveMap = interactiveMap;
}());
