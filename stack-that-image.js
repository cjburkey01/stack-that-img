let select_form, select_imgs;
let orient_vert, size_large;
let image_list, submit_btn;
let error_div, output_div;

let imgs_loaded = false;
let selected_files = [];
let num_images = 0;
let canvas;

// To make-a the nice-a!
const from_id = (id) => document.getElementById(id);

window.onload = () => {
    // Get elements
    select_form = from_id('select_form');
    select_imgs = from_id('select_imgs');
    orient_vert = from_id('vertical');
    size_large = from_id('largest');
    image_list = from_id('image_list');
    submit_btn = from_id('submit_btn');
    error_div = from_id('error_div');
    output_div = from_id('output_div');

    // Sanity check
    if (!select_form
            || !select_imgs
            || !orient_vert
            || !size_large
            || !image_list
            || !submit_btn
            || !error_div
            || !output_div) {
        alert('An error occurred while loading the page! Couldn\'t find the elements by ID??');
        return;
    }

    // Register callbacks
    select_imgs.onchange = on_add_imgs;
    select_form.onsubmit = on_submit;

    // We done initializing :)
    console.log('Loaded page');
};

function reset() {
    // Empty the arrays & reset
    imgs_loaded = false;
    selected_files.length = 0;
    submit_btn.style.display = 'none';
    // Empty these out
    image_list.textContent = '';
    error_div.textContent = '';
    output_div.textContent = '';
    canvas = null;
}

// Called when the user has selected some files
function on_add_imgs(e) {
    // Sanity check?? I don't trust Javascript
    if (!e || !e.target) { console.error('How did we get here?'); return; }

    let files = e.target.files;
    num_images += files.length;

    // Create the outer wrapper
    let img_outer = from_id('ol_outer');
    if (!img_outer) {
        img_outer = create_img_outer();
        image_list.appendChild(img_outer);
    }

    // Add the selected images to the list
    for (const file of files) {
        const blobURL = URL.createObjectURL(file);
        const img = new Image();
        img.src = blobURL;
        img.name = file.name;

        // Error handling
        img.onerror = () => {
            // Release URL
            URL.revokeObjectURL(this.src);
            console.error(`Failed to load image: ${file.name}`);

            // Write the error message for this file
            let error_elem = document.createElement('p');
            error_elem.textContent = `Failed to load ${file.name}!`;
            error_elem.style.color = '#992222';
            error_div.appendChild(error_elem);

            // Decrement the number of images we'll have to allow the submit
            // button to show even though not all images have loaded.
            num_images --;
        };

        // Update
        img.onload = () => {
            // Release URL
            URL.revokeObjectURL(this.src);
            console.log(`Image loaded: ${file.name}`);

            // Add the image
            selected_files.push(img);

            // Add this image element
            img_outer.appendChild(create_img_outer_item(file.name));

            // Check if all the files have been added
            if (selected_files.length == num_images) {
                on_imgs_ready();
            }
        };
    }
}

function create_img_outer() {
    let list = document.createElement('ol');
    list.id = 'ol_outer';
    return list;
}

function create_img_outer_item(file_name) {
    let item = document.createElement('li');
    let label = document.createElement('span');
    label.textContent = file_name;
    item.appendChild(label);
    return item;
}

// Called when all the images are ready inside `selected_files`
function on_imgs_ready() {
    console.log('All images ready');

    imgs_loaded = true;
    submit_btn.style.display = 'block';
}

// Called when the user presses the submit button
function on_submit(e) {
    // Don't redirect
    e.preventDefault();
    // Make sure all the things are loaded
    if (!imgs_loaded) { return; }

    // Create canvas
    create_canvas();
    downloadCanvasImg('joined-img.png');
    canvas.style.display = 'none';

    // Reset our stuff
    // TODO: reset();
}

function create_canvas() {
    // Check?
    if (!selected_files || selected_files.length < 1) { return; }

    // Helpful
    const is_vert = orient_vert.checked;
    const is_large = size_large.checked;

    // Initial values
    let width = selected_files[0].width;
    let height = selected_files[0].height;

    // The smallest image width,height
    let smallest = [width, height];
    // The smallest image width,height
    let largest = [width, height];

    // Determine the dimension opposite the orientation.
    // If the images are to be combined vertically, smallest[0] and largest[0]
    // will determine the final width of the image. Likewise, if we combine
    // horizontally, then smallest[1] and largest[1] are relevant.
    for (let i = 1; i < selected_files.length; i ++) {
        const img = selected_files[i];
        console.log(`Image ${img.name} is ${img.width}x${img.height}`);

        // Update min size (when sizing to the smallest image)
        smallest[0] = Math.min(smallest[0], img.width);
        smallest[1] = Math.min(smallest[1], img.height);
        // Update max size (when sizing to the largest image)
        largest[0] = Math.max(largest[0], img.width);
        largest[1] = Math.max(largest[1], img.height);
    }

    // Determine the known canvas dimension size
    let canvas_size = [
        is_vert ? (is_large ? largest[0] : smallest[0]) : 0,
        is_vert ? 0 : (is_large ? largest[1] : smallest[1]),
    ];

    // Determine each image's scale factor and the canvas size
    for (let img of selected_files) {
        if (is_vert) {
            img.scale = (is_large ? largest[0] : smallest[0]) / img.width;
            img.scale_w = Math.floor(img.scale * img.width);
            img.scale_h = Math.floor(img.scale * img.height);
            canvas_size[1] += img.scale_h;
        } else {
            img.scale = (is_large ? largest[1] : smallest[1]) / img.height;
            img.scale_w = Math.floor(img.scale * img.width);
            img.scale_h = Math.floor(img.scale * img.height);
            canvas_size[0] += img.scale_w;
        }
        console.log(`Image ${img.name} scaled by ${img.scale}, size: ${img.scale_w}x${img.scale_h}`);
    }

    console.log(`Output image size: ${canvas_size[0]}x${canvas_size[1]}`);

    // Create the canvas
    canvas = document.createElement('canvas');
    canvas.ariaHidden = 'true';
    canvas.width = canvas_size[0];
    canvas.height = canvas_size[1];
    output_div.appendChild(canvas);

    // Draw the images to the canvas
    const ctx = canvas.getContext('2d');
    let x = 0, y = 0;
    for (const img of selected_files) {
        const w = img.scale_w;
        const h = img.scale_h;
        ctx.drawImage(img, x, y, w, h);
        if (is_vert) {
            y += h;
        } else {
            x += w;
        }
    }
}

// Download a (potentially blob) URI
function downloadCanvasImg(file_name) {
    // I love js i love js i love js i love js
    const uri = canvas.toDataURL('image/png', 1);
    const link = document.createElement('a');
    link.ariaHidden = 'true';
    link.download = file_name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
