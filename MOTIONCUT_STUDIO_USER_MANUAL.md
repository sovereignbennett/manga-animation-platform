# MotionCut Studio User Manual

## Basic Workflow

1. Import an image or video from the Assets panel.
2. Select a layer on the canvas or in the Layers panel.
3. Use the top toolbar tools to position, animate, cut, or edit the layer.
4. Use the timeline to scrub frames and record keyframes.
5. Export from the Export panel.

## Navigation

- Scroll over the canvas to zoom.
- Hold Space and drag to pan.
- Use the zoom controls in the lower-right canvas HUD to zoom or reset the view.

## Selection And Transform Tools

### Select

Use Select to click a layer. Drag empty canvas space to marquee-select layers.

Shortcut: `V`

### Move

Select a layer, choose Move, then drag on the canvas.

If recording is on, moving writes position keyframes at the current frame.

Shortcut: `M`

### Rotate

Select a layer, choose Rotate, then drag around the selected layer.

If recording is on, rotating writes rotation keyframes at the current frame.

Shortcut: `R`

### Scale

Select a layer, choose Scale, then drag away from or toward the selected layer.

If recording is on, scaling writes scale keyframes at the current frame.

Shortcut: `S`

## Brush And Eraser

Brush and Eraser edit image pixels on the selected image layer.

1. Select an image layer.
2. Choose Brush or Eraser.
3. Drag over the visible image.
4. The stroke updates while dragging and commits to the layer.

Brush paints opaque pixels. Eraser removes pixels and creates transparency.

Shortcuts:

- Brush: `B`
- Eraser: `E`

## Lasso And Pen

Lasso and Pen are selection tools. They do not cut pixels yet.

1. Choose Lasso or Pen.
2. Drag around one or more layers.
3. Release the mouse.
4. Layers touched by the drawn shape become selected.

Lasso closes the shape visually while drawing. Pen behaves like a freehand path selection tool.

Shortcuts:

- Lasso: `L`
- Pen: `P`

## Magic Cut

Magic Cut sends the selected image layer through the segmentation pipeline and creates rig-ready body-part layers.

1. Select an image layer.
2. Open Magic Cut.
3. Run Magic Cut.
4. The source layer is hidden and a rigged group is created.

Shortcut: `W`

## Timeline And Recording

Recording controls whether transform edits become keyframes.

- Recording off: transform edits change the layer's static position, rotation, scale, opacity, or anchor.
- Recording on: transform edits write keyframes at the current frame.

Pixel edits from Brush and Eraser are not timeline keyframes. They edit the layer bitmap itself.

## Export

Open the Export panel to export:

- PNG
- Transparent PNG
- MP4
- GIF
- Sprite sheet

