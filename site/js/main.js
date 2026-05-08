// 1. 生成唯一标识符
var current_timestamp = Math.floor(Date.now() / 1000).toString();
var random_number = Math.floor(Math.random() * 1000000000).toString();
var identifier = current_timestamp + "" + random_number;

// 2. 音频处理
var sound;
var audio_context;

function initAudio() {
    if (!audio_context) {
        audio_context = new (window.AudioContext || window.webkitAudioContext)();
    }
    // 如果音频环境被挂起（浏览器策略），尝试恢复
    if (audio_context.state === 'suspended') {
        audio_context.resume();
    }
}

function playSound() {
    if(sound !== undefined && audio_context){
        // 每次播放前确保 context 是激活状态
        if (audio_context.state === 'suspended') {
            audio_context.resume();
        }
        var source = audio_context.createBufferSource();
        source.buffer = sound;
        source.connect(audio_context.destination);
        source.start(0);
    }
    if('vibrate' in window.navigator){
        window.navigator.vibrate(50);
    }
}

// 修正音频路径：去掉开头的斜杠以兼容本地运行
if(window.AudioContext || window.webkitAudioContext){
    var audio_url = 'sounds/hero.mp3'; // 修改点：/sounds -> sounds

    var temp_context = new (window.AudioContext || window.webkitAudioContext)();
    var sound_request = new XMLHttpRequest();
    sound_request.open('GET', audio_url, true);
    sound_request.responseType = 'arraybuffer';
    sound_request.onload = function() {
        temp_context.decodeAudioData(sound_request.response, function(buffer) {
            sound = buffer;
            audio_context = temp_context; 
        });
    };
    sound_request.send();
}

// 3. Canvas 绘图逻辑 (保持不变)
var canvas = document.querySelector("#ripples");
var canvas_data = {
    center_x: 0,
    center_y: 0,
    ripple_increment: 6,
    opacity_decrement: 0.1
};
var ctx = canvas.getContext('2d');
var ripples = [];
var channame = (Boolean(location.hash)) ? location.hash.substr(1) : "default_chan_name"

var ripple = function(mine){
    playSound();
    var obj = { size: 0, opacity: 1, mine: false };
    if(mine) obj.mine = true;
    ripples.push(obj);
}

var updateCanvasData = function(){
    canvas.setAttribute("width", window.innerWidth * 2);
    canvas.setAttribute("height", window.innerHeight * 2);
    canvas_data.center_x = window.innerWidth;
    canvas_data.center_y = window.innerHeight;
    canvas_data.ripple_max_size = (window.innerWidth > window.innerHeight ? window.innerWidth : window.innerHeight);
    canvas_data.ripple_increment = canvas_data.ripple_max_size / 60;
    canvas_data.opacity_decrement = 1 / (canvas_data.ripple_max_size / canvas_data.ripple_increment); 
};

window.addEventListener("resize", updateCanvasData);
updateCanvasData();

var draw = function(){
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, window.innerWidth * 2, window.innerHeight * 2);
    ripples.forEach(function(obj, index){
        obj.size += canvas_data.ripple_increment;
        ctx.beginPath();
        ctx.arc(canvas_data.center_x, canvas_data.center_y, obj.size, 0, 2 * Math.PI, false);
        obj.opacity -= canvas_data.opacity_decrement;
        if(obj.opacity < 0) obj.opacity = 0;
        ctx.fillStyle = 'transparent';
        ctx.fill();
        ctx.lineWidth = 2;
        if(obj.mine){
            ctx.strokeStyle = 'rgba(255,255,255,' + obj.opacity + ")";
        } else {
            ctx.strokeStyle = 'rgba(0,0,0,' + obj.opacity + ")";
        }
        ctx.stroke();
        if(obj.size > canvas_data.ripple_max_size){
            ripples.splice(index, 1);
        }
    });
}
draw();

// 4. 修改连接地址：指向你自己的 Render 服务器
// 注意：Faye 不需要加 :8000 端口，直接用 Render 的 HTTPS 地址
var client = new Faye.Client("https://i-love-you-h1eu.onrender.com/"); 

client.subscribe("/"+channame, function(message){
    if(message.sender !== identifier){
        ripple(false);
    }
});

var heart = document.querySelector("#heart");
var handler = function(e){
    e.preventDefault();
    initAudio(); // 关键修改：在用户点击时激活音频环境
    client.publish('/'+channame, {sender: identifier});
    ripple(true);
    return false;
}

heart.addEventListener("click", handler);
heart.addEventListener("touchstart", handler);