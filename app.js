const canvas = document.getElementById('stageCanvas');
const ctx = canvas.getContext('2d');

// --- State Variables ---
let roomImage = new Image();
let paintings = [];          
let selectedPainting = null; 
let activePainting = null;   
let dragOffset = { x: 0, y: 0 };

// Constant scale factor: 1 Inch = 5 Pixels constant mapping.
// Wall dimension adjustments will make absolutely NO impact on layout scales.
const FIXED_PPI = 5; 

// Load default placeholder stage background
roomImage.src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop';
roomImage.onload = drawCanvas;

// --- Background Image Upload Tool ---
document.getElementById('bgUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = event => { roomImage.src = event.target.result; };
        reader.readAsDataURL(file);
    }
});
roomImage.onload = () => drawCanvas();

// Note: No event listeners are attached to wallWidthInches or wallHeightInches,
// ensuring changes to those fields have zero computational impact.

// --- Artwork Image Upload Processing ---
document.getElementById('artUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const uploadedArtImg = new Image();
            uploadedArtImg.src = event.target.result;
            
            uploadedArtImg.onload = function() {
                // Default settings on instantiation
                const defaultInchesW = 36;
                const aspectRatio = uploadedArtImg.height / uploadedArtImg.width;
                const defaultInchesH = Math.round(defaultInchesW * aspectRatio);

                const item = {
                    img: uploadedArtImg,
                    realInchesW: defaultInchesW,
                    realInchesH: defaultInchesH,
                    width: defaultInchesW * FIXED_PPI,
                    height: defaultInchesH * FIXED_PPI,
                    x: 120 + (paintings.length * 20),
                    y: 120 + (paintings.length * 20),
                    frameColor: 'none',
                    frameWidthInches: 1.5,
                    brightness: 100
                };
                paintings.push(item);
                setActivePainting(item);
                e.target.value = ''; 
            };
        };
        reader.readAsDataURL(file);
    }
});

// --- Sync Selection State to Side Panel Sliders ---
function setActivePainting(art) {
    activePainting = art;
    const panel = document.getElementById('customizer');
    
    if (!art) {
        panel.classList.add('disabled');
        drawCanvas();
        return;
    }
    
    panel.classList.remove('disabled');
    
    // Set slider positions to reflect selected art's active properties
    document.getElementById('artWidthSlider').value = art.realInchesW;
    document.getElementById('artWidthVal').innerText = `${art.realInchesW} inches`;
    
    document.getElementById('artHeightSlider').value = art.realInchesH;
    document.getElementById('artHeightVal').innerText = `${art.realInchesH} inches`;
    
    document.getElementById('frameColor').value = art.frameColor;
    document.getElementById('frameWidthInches').value = art.frameWidthInches;
    document.getElementById('frameWidthVal').innerText = `${art.frameWidthInches} inches`;
    document.getElementById('artBrightness').value = art.brightness;
    
    drawCanvas();
}

// --- Live Range Slider Event Listeners ---
document.getElementById('artWidthSlider').addEventListener('input', e => {
    if (activePainting) {
        activePainting.realInchesW = parseInt(e.target.value);
        document.getElementById('artWidthVal').innerText = `${activePainting.realInchesW} inches`;
        
        // Recalculate pixel dimensions directly via fixed ratio multiplier
        activePainting.width = activePainting.realInchesW * FIXED_PPI;
        drawCanvas();
    }
});

document.getElementById('artHeightSlider').addEventListener('input', e => {
    if (activePainting) {
        activePainting.realInchesH = parseInt(e.target.value);
        document.getElementById('artHeightVal').innerText = `${activePainting.realInchesH} inches`;
        
        // Recalculate pixel dimensions directly via fixed ratio multiplier
        activePainting.height = activePainting.realInchesH * FIXED_PPI;
        drawCanvas();
    }
});

document.getElementById('frameColor').addEventListener('change', e => { if(activePainting) { activePainting.frameColor = e.target.value; drawCanvas(); } });

document.getElementById('frameWidthInches').addEventListener('input', e => {
    if(activePainting) {
        activePainting.frameWidthInches = parseFloat(e.target.value);
        document.getElementById('frameWidthVal').innerText = `${activePainting.frameWidthInches} inches`;
        drawCanvas();
    }
});

document.getElementById('artBrightness').addEventListener('input', e => { if(activePainting) { activePainting.brightness = parseInt(e.target.value); drawCanvas(); } });
document.getElementById('deleteArt').addEventListener('click', () => { if(activePainting) { paintings = paintings.filter(p => p !== activePainting); setActivePainting(null); } });

// --- Render Engine Pipeline ---
function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(roomImage, 0, 0, canvas.width, canvas.height);

    paintings.forEach(art => {
        ctx.save();
        
        let framePx = 0;
        if (art.frameColor !== 'none') {
            framePx = art.frameWidthInches * FIXED_PPI; 
            
            ctx.fillStyle = art.frameColor;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 8;
            ctx.shadowOffsetY = 10;
            ctx.fillRect(art.x - framePx, art.y - framePx, art.width + (framePx * 2), art.height + (framePx * 2));
            ctx.shadowColor = 'transparent'; 
        } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 6;
        }

        ctx.filter = `brightness(${art.brightness}%)`;
        ctx.drawImage(art.img, art.x, art.y, art.width, art.height);
        ctx.restore();

        if (art === activePainting) {
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(art.x - framePx - 4, art.y - framePx - 4, art.width + (framePx * 2) + 8, art.height + (framePx * 2) + 8);
            ctx.setLineDash([]);
        }
    });
}

// --- Interaction Input Target Layer Selection Bound Math ---
canvas.addEventListener('mousedown', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    let hitDetected = false;

    for (let i = paintings.length - 1; i >= 0; i--) {
        let art = paintings[i];
        const framePx = art.frameColor !== 'none' ? art.frameWidthInches * FIXED_PPI : 0;

        if (
            mouseX >= art.x - framePx && mouseX <= art.x + art.width + framePx &&
            mouseY >= art.y - framePx && mouseY <= art.y + art.height + framePx
        ) {
            selectedPainting = art;
            dragOffset.x = mouseX - art.x;
            dragOffset.y = mouseY - art.y;

            paintings.splice(i, 1);
            paintings.push(selectedPainting);
            
            setActivePainting(selectedPainting);
            hitDetected = true;
            break;
        }
    }
    if (!hitDetected) setActivePainting(null);
});

canvas.addEventListener('mousemove', function(e) {
    if (!selectedPainting) return;
    const rect = canvas.getBoundingClientRect();
    selectedPainting.x = e.clientX - rect.left - dragOffset.x;
    selectedPainting.y = e.clientY - rect.top - dragOffset.y;
    drawCanvas();
});

canvas.addEventListener('mouseup', () => selectedPainting = null);
canvas.addEventListener('mouseleave', () => selectedPainting = null);
