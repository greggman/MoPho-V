## Default keys

You can of course change the keys to whatever you'd like
in preferences but the defautls are

```
--[ regular controls ]-- or for when laptop has left side of screen up
ctrl    next item
shift   prev item
tab     advance 10 seconds if video or next item if image
tilda   rewind 5 seconds if video or prev item if image
z       cycle stretch mode
x       rotate

--[ bottom controls ]-- or for when laptop has right side of screen up
]       next item
\       next item
[       prev item
right   advance 10 seconds if video or next item if image
left    rewind 5 seconds if video or prev item if image
esc     close the viewer
.       cycle stretch mode
/       rotate

--[ aswd controls ]--
q       advance 10 seconds if video or next item if image
w       rewind 5 seconds if video or prev item if image
a       rotate

--[ misc ]--
p       pause/play video
s       start/stop slideshow
l       set loop. 1st press sets start
                  2nd press sets end and starts looping
                  3rd press clears loop.
1       set video playback speed to 1x
2       set video playback speed to .66x
3       set video playback speed to .5x
4       set video playback speed to .33x
5       set video playback speed to .25x
F1      zoom in
F2      zoom out
F3      make next pane active
F4      make prev pane active
F5      cycle UI. No toolbar, No folders, Neither, Both
F6      split current pane horizontally
F7      split current pane vertically
F8      delete current pane
esc     close the viewer
```

## Zoom/Stretch Modes

Pressing zoom cycles though the following modes

*   **constain**

    scale down so the image fits the view but
    never larger than its actual size

*   **stretch**

    scale up or down to fit the view

*   **cover**

    scales so that the entire view is covered by
    the image even of part of that image ends up offscreen

*   **actual size**

    Just what it says.

*   **fit width**

    scale until the image fills the width of the view

*   **fit height**

    scale until the image fills the height of the view

## Rotation

There are 2 types of rotation

1. When a video or image is being viewed and that pane has
   the focus then rotate rotates
   that viewer.

2. When a tbumbnail pane has the focus then rotate
   rotates the entire UI

   The point of rotating the entire UI is to re-orient
   your laptop to better fit the topic you're
   viewing.

   Note that at the moment the feature is designed for
   laptops and trackpads. See FAQ.

## Filters

filters help you find images.

Just typing letters matches the entire path. So for example `gif`
matchs both `spinning-n.gif` and `gifs/nerf.jpg`. `.gif` would match
both `christmas.gifts/nuts.png` and `neptune.gif`

words that end in a colon `:` are considered a special filter. 

*   `width:`
*   `height:`
*   `aspect:`
*   `size:`

all of these take a comparision and a number. Examples

    width:>1000
    height:<=512
    aspect:>1
    size:20k

`aspect` can also be `aspect:landscape` and `aspect:portrait`
which are just synomyms for `aspect:>1` and `aspect:<1` respectively.

`size` and can take the following case insensitive suffixes

*   `k`, `kb`
*   `m`, `mb`
*   `g`, `gb`
*   `t`, `tb`

examples

    size:>100mb
    size:>1.5gb

*   `date:`

takes a date in `YYYY-MM-DD` format as in

    date:<2015
    date:>2018-02-15

*    `folder:` 
*    `dir:`
*    `dirname:`

work the same as above but only match the folder portion
so `folder:nuts` would match `nuts/almond.jpg` but not
`collections/nuts.gif`

*    `basename:`
*    `filename:`

Do the same for just the base name of the file so
`filename:new` would match `animals/newts.mp4` but
not `newspapers/post.png`.

*    `bad:` 

Will show files that could not be opened for some reason.

*    `type:`

Filters on mime-types so for example `type:video` would
show all videos and `type:image/gif` would show all gifs.

### Comparision Operators

*    `>` greater than
*    `>=` greater than or equal to
*    `<` less than
*    `<=` less than or equal to
*    `==` equal to
*    `===` equal to
*    `!=` not equal to 
*    `!==` not equal to

Comparison operators only work with `width:`, `height:`,
`aspect:`, `size:`, and `date:`.



