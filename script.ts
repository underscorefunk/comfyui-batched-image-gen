
let current_image_index = 0;
let seed = 1
let prompts = [
    "beautiful flower fractal cinematic",
    "beautiful flower luminescent fractal alien cinematic"
];
let neg_prompt = "text, hazy, disorted, malformed, blurry";

let submitPrompt = async function(url = "", data = {}) {
    const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(data),
    });
    return response.json();
}

let makePromptRequest = function(seed, promptText) {
    return {
        "prompt": {
            "3": {
                "inputs": {
                    "seed": seed,
                    "steps": 30,
                    "cfg": 8,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1,
                    "model": [
                        "4",
                        0
                    ],
                    "positive": [
                        "6",
                        0
                    ],
                    "negative": [
                        "7",
                        0
                    ],
                    "latent_image": [
                        "5",
                        0
                    ]
                },
                "class_type": "KSampler"
            },
            "4": {
                "inputs": {
                    "ckpt_name": "dreamshaperXL10_alpha2Xl10.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "5": {
                "inputs": {
                    "width": 1024,
                    "height": 1024,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "6": {
                "inputs": {
                    "text": promptText,
                    "clip": [
                        "4",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "text": neg_prompt,
                    "clip": [
                        "4",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": [
                        "3",
                        0
                    ],
                    "vae": [
                        "4",
                        2
                    ]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ComfyUI" + "_seed_" + seed,
                    "images": [
                        "8",
                        0
                    ]
                },
                "class_type": "SaveImage"
            }
        }
    }
};


function queueNextImage() {
    let promptRequest = makePromptRequest(seed, prompts[current_image_index] );
    submitPrompt("http://127.0.0.1:8188/prompt", promptRequest).then((data) => {
        console.log( "CLIENT >> Queueing image generation..." + prompts[current_image_index]);
        console.log(data); // JSON data parsed by `data.json()` call
    });
    current_image_index++;
}

function doneQueue() {
    return current_image_index >= prompts.length - 1;
}

function logError(msg: string) {
    console.log(msg);
    Deno.exit(1);
}

function handleConnected(ws: WebSocket) {
    console.log("CLIENT >> Connected to server ...");

}

function handleMessage(ws: WebSocket, data: string) {
    let msg = JSON.parse(data);
    if ( msg.type == "status" ) {
        console.log( "SERVER >> " + data );
        if ( msg.data.status.exec_info.queue_remaining == 0 ) {
            if ( doneQueue() ) {
                ws.close(1000, "CLIENT >> Finished processing queue.");
                return;
            }
            queueNextImage()
        }
    }


}

function handleError(e: Event | ErrorEvent) {
    console.log(e instanceof ErrorEvent ? e.message : e.type);
}

console.log("CLIENT >> Connecting to ComfyUI server ...");
try {
    const ws = new WebSocket("ws://127.0.0.1:8188/ws?clientId={}");
    ws.onopen = () => handleConnected(ws);
    ws.onmessage = (m) => handleMessage(ws, m.data);
    ws.onclose = () => logError("CLIENT >> Disconnected from server ...");
    ws.onerror = (e) => handleError(e);

} catch (err) {
    logError("CLIENT >> Failed to connect to server ... exiting");
}