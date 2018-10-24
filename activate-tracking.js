import * as utils from './js/libs/utils.js';

let vid = document.getElementById('videoel');
let vid_width = vid.width;
let vid_height = vid.height;
let overlay = document.getElementById('overlay');
let overlayCC = overlay.getContext('2d');
let container = document.getElementById('container');

/*********** Setup of video/webcam and checking for webGL support *********/

function enablestart() {
    var startbutton = document.getElementById('startbutton');
    startbutton.value = "start";
    startbutton.disabled = null;
}

var insertAltVideo = function(video) {
    // insert alternate video if getUserMedia not available
    if (supports_video()) {
        if (supports_webm_video()) {
            video.src = "./media/cap12_edit.webm";
        } else if (supports_h264_baseline_video()) {
            video.src = "./media/cap12_edit.mp4";
        } else {
            return false;
        }
        return true;
    } else return false;
}

function adjustVideoProportions() {
    // resize overlay and video if proportions of video are not 4:3
    // keep same height, just change width
    var proportion = vid.videoWidth/vid.videoHeight;
    vid_width = Math.round(vid_height * proportion);
    vid.width = vid_width;
    overlay.width = vid_width;
}

function gumSuccess( stream ) {
    // add camera stream if getUserMedia succeeded
    if ("srcObject" in vid) {
        vid.srcObject = stream;
    } else {
        vid.src = (window.URL && window.URL.createObjectURL(stream));
    }
    vid.onloadedmetadata = function() {
        adjustVideoProportions();
        vid.play();
    }
    vid.onresize = function() {
        adjustVideoProportions();
        if (trackingStarted) {
            ctrack.stop();
            ctrack.reset();
            ctrack.start(vid);
        }
    }
}

function gumFail() {
    // fall back to video if getUserMedia failed
    insertAltVideo(vid);
    document.getElementById('gum').className = "hide";
    document.getElementById('nogum').className = "nohide";
    alert("There was some problem trying to fetch video from your webcam, using a fallback video instead.");
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;

// set up video
if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({video : true}).then(gumSuccess).catch(gumFail);
} else if (navigator.getUserMedia) {
    navigator.getUserMedia({video : true}, gumSuccess, gumFail);
} else {
    insertAltVideo(vid);
    document.getElementById('gum').className = "hide";
    document.getElementById('nogum').className = "nohide";
    alert("Your browser does not seem to support getUserMedia, using a fallback video instead.");
}

vid.addEventListener('canplay', enablestart, false);

/*********** Code for face tracking *********/

var ctrack = new clm.tracker();
ctrack.init();
var trackingStarted = false;

function startVideo() {
    // start video
    vid.play();
    // start tracking
    ctrack.start(vid);
    trackingStarted = true;
    // start loop to draw face
    drawLoop();
}

function arrayToPoint(array) {
    return {
        x : array[0],
        y : array[1]
    }
}

function distanceBetweenPointsWithoutSqrt(p1, p2) {
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    return (dx * dx) + (dy * dy);
};

// This function takes in a left, right, & center points & produced a float that describes
// which way the center point is tilting, so:
// = 1.0 => completely centered
// < 1.0 => tilted toward the left
// > 1.0 => tilted toward the right
function getRotationProxy(left, right, center) {
    return distanceBetweenPointsWithoutSqrt(right, center) / distanceBetweenPointsWithoutSqrt(left, center);
}

function drawCircle(center, radius) {
    overlayCC.beginPath();
    overlayCC.arc(center.x, center.y, radius, 0, 2*Math.PI);
    overlayCC.stroke();
}

function drawLoop() {
    utils.requestAnimFrame()(drawLoop);
    overlayCC.clearRect(0, 0, vid_width, vid_height);
    let positions = ctrack.getCurrentPosition();
    if (positions) {
        let leftEye = arrayToPoint(positions[27]);
        let rightEye  = arrayToPoint(positions[32]);
        let distanceBetweenEyes = (rightEye.x - leftEye.x);
        let circleRadius = distanceBetweenEyes * 0.5;

        let nose = arrayToPoint(positions[37]);

        // Subtract 1.0 to get a number centered around 0
        let rotationProxy = getRotationProxy(leftEye, rightEye, nose) - 1.0;

        // overlayCC.strokeStyle = "green";
        // drawCircle(leftEye, 10);

        // ctrack.draw(overlay);

        overlayCC.strokeStyle = "black";
        overlayCC.fillStyle = "rgba(0,0,0,0.5)";
        for (let i = 0; i < 200; i += 50) {
            overlayCC.beginPath();
            let newCenterArray = [leftEye.x + circleRadius + (i * (-1 * rotationProxy)), leftEye.y];
            let newCenter = arrayToPoint(newCenterArray);
            drawCircle(newCenter,  circleRadius);
            // overlayCC.stroke();
            overlayCC.fill();
        }
    }
}

/*********** Code for stats **********/
let stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
container.appendChild( stats.domElement );
stats.domElement.style.display = 'none';

// update stats on every iteration
document.addEventListener('clmtrackrIteration', function(event) {
    stats.update();
}, false);

let startButton = document.createElement('input');
startButton.classList.add('btn');
startButton.type = 'button';
startButton.value = 'wait, loading video';
startButton.disabled = 'disabled';
startButton.onclick = startVideo;
startButton.id = 'startbutton';
// <input class="btn" type="button" value="wait, loading video" disabled="disabled" onclick="startVideo()" id="startbutton"></input>
container.appendChild(startButton);
