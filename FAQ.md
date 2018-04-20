# FAQ

## Why?

Why not? Using VLC or other viewers to view multiple
things at once is fairly tedious. VLCs zoom controls
leave much to be desired. For example in order to
approach a 'cover' mode you had to manually set the
cropping settings which take a lot of work to get right.

Portrait mode was hard as well. The controls don't
rotate. You could rotate the entire OS but that
was also tedious.

Most Comic viewers also don't have a portrait mode.
You can rotate an image but when you go to the next
image you have to manually rotate that one as well.
The rotation is not "sticky". Yet, reading a comic
in portrait mode is often far closer to the real
experience of reading a comic. Worse, the even if
the rotation is sticky the UI is still in landscape.

MoPho-V fixes those issues

## Why Electron?

My hope was that by using Electron more people could contribute as more
people have HTML, CSS, JavaScript experience. If there are ideas for plugins
or features I'm all ears although code speaks louder than words.

## Why is my mouse movement messed up when I rotate the app?

First off let's be clear, there are 2 kinds of rotation. 

1. the rotation of individual images and videos. When a video or image
is being viewed pressing the rotate key or button rotates that image.

2. the type of rotation that rotates the entire app. If you're viewing
a grid of images pressing the rotate key or button rotates the entire
app. At that point it's assumed you rotated your laptop or monitor to
match. 

For a laptop, when you rotate the laptop both the screen and the
touchpad rotate so the touchpad input still matches the screen. The
only thing that needed to be addressed was the mouse wheel and
scrollbars.

For a desktop, using a mouse, if you rotate your monitor your
mouse movement no longer matches your monitor. Handling that
sitatuion is fairly hard.

That's the long way of saying MoPho-V's app rotation support
is very cool IMO but only meant for laptops.

## Why is the toolbar on the bottom?

Because, at least on macOS, moving the mouse near the top
of the screen pops up the OS menu and getting it to disappear
is annoying. This is important when in fullscreen mode.
You'd move the mouse up to the toolbar to do something only to
have macOS pop it down where you were not aiming. 
By moving the toolbar to the bottom that issue
is fixed. 

You can choose to have the toolbar at the top in
the preferences settings.

## Why does it show conflict when I assign keys like Shift-C or Ctrl-J

MoPho-V's default keys use Ctrl for previous and Shift
for next. That's beacuse when holding a laptop computer
vertically those keys are easy to reach.  Un-map those
keys if want to use them as modifiers to other keys.

## Plugins?

I'd like to support plugins if there is a compelling use case.
Originally I was hoping to write plugins to support various websites.
Upon reflection I realized that's probably a bad idea. Chrome and Firefox
are updated regularly to avoid exploits. Electron not so much so
it seems irresponsible to use Electron to browse the web.

One possible solution to that is to write some kind of extensions
for Chrome/Firefox and have them some how communicate to MoPho-V.
One example might be to be able to select one or more images in
MoPho-V and have them uploaded to a service by passing the list of files
to the extension and then the extension could use a regular
more secure browser to talk to the actual website.

Other ideas for plugins would be

*   Archive Plugins

    Support more than .ZIP and .RAR. 
    
    Is there really anything else out there in use?

*   Image, Video Plugins

    Support other image and video formats. For video see below. For images
    is there anything else important to support? In other words does
    any one have collections of images in other formats for which MoPho-V
    is a good match?

## Skinning, Themes?

Closely related to plugins would be themes. Other than colors I'm not
really sure what a theme would provide since the UI is fairly dense.

It's possible the current UI could be converted to various components
and the code to glue those together separated out so themes could then more easily
redesign the UI. Before spending time there some sketches or mockups
of different UIs would be helpful just to see that it's worth while
to spend the time.

## When are you going to support .AVI, .DVIX, etc?

The short answer is as soon as you provide the PR to enable it.

MoPho-V is based on Electron which is based on Chromium which currently only supports mp4, ogv, webm, and some mkvs.
Two possible paths to add other format support are 

1. enabling more codecs in Chromium

   Chromium uses ffmpeg to decode video. It's compiled to only support the formats Chromium needs. It should be possible
   to compile it to support more formats.

2. porting ffmpeg or other video library to WebAssembly + Workers

   It should be possible to port ffmpeg to WebAssembly. Using OffscreenCanvas it should be
   semi performant to decode video in a worker. Audio would have to be shuttled via
   ArrayBuffer transfer of ownership back to the main thread OR via SharedArrayBuffers.
   Some form of delay of both video and audio would be needed to sync up the two.

