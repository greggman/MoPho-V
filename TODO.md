TODO
================================================================================

-- Just because I want to --
================================================================================

[X] Use File at a time Zip lib

    current zip lib (jszip) has to unzip entire zip before we get any data.
    This makes viewing slow.
    
    Switched to unzipit but now there's a new issue (see next) 

[X] Unzip entire file

    I switched to unzipit for the issue above BUT, the new issue
    is switching between images in a single zip takes too long.
    Instead it should first unzip the image that the user clicked
    on and then start unzipping the rest of the images. My guess
    is if there are 100 images and the user clicks on image 17
    then it should unzip 17, followed by 18 to 100 and then
    maybe 16->1 or 1 to 16. It seems like there is some higher
    the zero chance the user will go backward so what heristic 
    if any should be taking to decide to unzip 16 before say
    image 40. Worse, of the top of my head the cooridination would
    really suck. I mean at the moment no info is sent to the unzip
    process except give me image somefile.zip/someimage17.jpg
    so it just has to guess you probably want all the other images
    in somefile.zip. Let's assume it starts unzipping 18 to 100.
    Then the user presses back and wants image 16. It sounds like
    a lot of coordination to tell the backend, STOP! unzipping
    18 to 100 and start 16 to 1. As it is there are something line
    8 layers between the unzipping code and the viewing code and
    the unzipping code isn't organized at all to handle this.
    I guess much more coordination and a very different architechture
    would be required.
    
    The back end needs some kind of queue of requests and a way
    to change priorities and remove requests. IIRC that's not
    there now. Well, the queue is but the rest is not.

[ ] Use File at a time Rar lib

    current rar lib has to unrar entire rar before we get any data.
    This makes viewing slow

[ ] split at same location.

    In other words when you split a view both splits should look the same,
    same scroll location.
    
[ ] Fix delete on network

[ ] Allow saving current collection of panes, zoom, speed, loops,
[ ] When sizing window keep left column same size (unless it won't fit)
[ ] Be able to move picture larger than screen
[ ] Save loops per video
[ ] Save currently viewed images (entire state of app)

    This should really save entire state. For each pane
    what image, slideshow on or off, video playing or not
    at which speed, which zoom, which stretch mode, which
    rotation, which loop settings.
[ ] fix image flash. Issue is src and other settings happen separately?

[ ] Support VR through WebVR

    So I got a Daydream recently and Chrome 66 with a bunch of
    flags turned on supports running Chrome as an app inside Daydream.
    You can use the Daydream controller to point at and click links.
    You can enable a VR keyboard so you can type URL in VR and click on
    text boxes. If you go to aframe.io you can run lots of WebVR demos
    and not have to leave the HMD.

    So, that got me thinking I could use MoPho-V to serve a webpage
    to browse your images in WebVR. It's not perfect and it's probably
    got speed and memory issues but I thought I'd try it.

    I plugged in happyfuntimes and routed the database messages through
    and got a webpage running with debug output.

    I remapped the various URLs so that MoPho-V can intercept the requests
    and show the files. In other words Android Chrome asks for image at
    "/folder-id-7/foo/bar.jpg" and the server running in MoPho-V returns
    the data for "/path/to/base-folder-7/foo/bar.jpg"

    Things that are left

    [ ] Display in A-Frame (or other WebVR)

        I'm serving A-Frame and the demo works

    [ ] Get a single grid up that you can scroll through

    [ ] Make a single viewer work

    [ ] Figure out a UI

        Not sure grids and panes make sense in VR. Maybe there should
        just be one grid you can make appear/disappear. You can then
        choose an image then drag that image wherever you want. Consider
        that one pane so you can click forward/back and select slideshow
        for that image. Bring up the grid again and pick another
        and drag that somewhere else? Save the layout so you don't have
        to set it up again?

        Seems like you'd also want to be able to size images, and of course
        rotate, etc..

    [ ] Support 180/360/3D videos

        I'm not sure A-Frame supports this. I know it supports 360 videos.
        I don't know if it supports 360 3D or 180 3D.

        Also either need a UI to select format of video or else need
        you to rename the files with known formats like name-180_180x180_3dh_LR.mp4.
        Suspect you can't play videos because of WebGL overhead.

        Ideally the browser would let you use 3D CSS and you could
        just use HTML video elements. The other option is WebGL extensions
        for handling video better.

        This is kind of a killer.

    [ ] VR Issues

        *   no HTTPS so not sure what stuff Chrome is going to block :(

        *   Mobile can only play one video at a time

            Solution might be to show multiple videos but
            only play the last one clicked. Not even sure
            mobile supports showing the thumbnails to multiple
            videos but will get there when we get there.

        *   Suspect gifs are not supported in AFrame and they are certainly not supported by WebGL directly.

        *   Not sure about speed issues (bandwidth)

        *   Not sure how to handle archives

            Currently they are decompressed into a collection
            of blobs. URLs for those blobs are only valid in
            the MoPho-V, not the browser. Options include:

            *   Browser requests file, browser process asks thumber for data,
                thumber provides data to browser process, browser process serves
                data.

                That sounds easiest as no new decompression code needed.
                It also sound problematic. Certainly not good for streaming
                video.

            *   Browser requests file, browser process decompresses.
                The decompression code should work but I don't like the idea
                that the browser process can crash if the archive is too
                big. Switching archive libraries might fix.

            For now I should just filter out archive data on the client.

        *   Security: The files have to be served. On the one hand
            it's really only for your home network. On the other if you
            have it running on you lap top and then walk to the cafe
            your files are effectively public.

            One solution is to add a password or PIN. You'd enter it
            in VR when you connect. It would generate some access token
            that is valid only for that session so if someone else
            connects they need to know the PIN to generate their own
            token.

        *   Connecting: Since it's happyfuntimes you open Chrome in Daydream
            and go to happyfuntimes.net. Can certainly run a vr.mopho-v.org or
            something. The only data passed to happyfuntimes.net is your
            public IP address and your private IP for the machine running MoPho-V.
            The private one isn't useful to anyone not on your LAN so that
            seems innocuous.

            There's no other identifying info (well, I don't look at user agent etc).
            It would be nice not to have to ping outside but then you have to
            browse to something like `http://192.168.1.27:18679` which is more
            painful IMO and not as bookmark-able (might change). Can certainly
            make it an option not to ping.

            One solution would be a native app on Daydream. It could then
            do what things like ChromeCast do and just broadcast for something
            on the same net. But, a native app is slightly beside the point which
            is that you have to trust them. With a webpage it's semi-easy to
            just open the DevTools and see every network request they make to
            see if they are being evil and if you're being spied on.
            
    [ ] Use Desktop VR directly in Electron
    
        Originaly I got a daydream. I had no hope of running this app on
        Daydream so having MoPho-V just serve to the browser made sense to
        allow Daydream to view. But, ... since then I got desktop VR in which
        case I should be able to use the built in VR support in Chromium/Electron
        to make the app itself do something in VR.

-- MVP --
================================================================================

[ ] fix filters . Typed a word and 4 folders showed on left but only 1 on right

    it's a display issue, sizing the window makes them appear on the right

[ ] fix flashing playback, scrollbars (not sure how to repo)

    sometimes when playing a video the display flashes some elements
    in and out. It seems like some strange CSS bug where something is
    fitting on the screen then not. The range slider and the current
    time are updated. The time seems more likely the issue as in
    as the numbers change one the width of that cell changes.
    Why it only happens sometimes though is unclear. Maybe just
    giving the time a fixed width would fix it but I can't repo
    the issue on demand so I can't check the fix works.

[ ] figure out electron thrash

    when loading a large collection the collection itself loads relatively
    quickly but Electron is busy doing internal bookkeeping for several seconds
    10-60 second during which the page is unresponsive. Profiling shows no
    JS executing.

    This might have been mobx. The issue there is every time you access
    a field being watched by mobx it does a bunch of bookkeeping. So
    for example displaying 300 thumbnails might end up going through
    that bookkeeping code 300 times. I moved the access of those fields
    higher in the code and then they just get passed down as props
    instead of passing down the mobx object. That *seems* to have fixed
    it but I'm not sure.

[ ] Fix scroll position issues

    Scroll several folders of images down, view image, close viewer.
    Notice you're no longer scrolled to the same spot.
    Similarly typing filters loses your place.

    Need to do some thing where we keep track of the top visible image
    or the last image you clicked on and then try to keep that in view
    both when restoring the imagegrids and when resizing


-- Kinda MVP --
================================================================================


[ ] Add toolbar icon to sync list to current pane

    no. Just put left arrow at top of group

[ ] Show parent folders

    As it is only folders that have files in them get shown so if you have

        dogs
          german shepherds
            img1.jpg
            img2.jpg
          pugs
            img1.jpg
            img2.jpg
          bulldogs
            img1.jpg
            img2.jpg

    Then 'dogs' is not shown since it has no files in it. This can make
    things look strange. Example

        cats
          img1.jpg
        dogs
          german shepherds
            img1.jpg
            img2.jpg

    Will show

        cat(1)
          german shepherds(2)

    Because 'dogs' is not shown.

    Fixing this is actually a little bit of work. As it is 'dogs` is not even
    stored on the viewer side.

    Currently FolderDB stores the view side DB of folders. It discards folders
    with zero files. It receives folders in any order so it receives parent
    discards it because files. Then it receives child. It could create parent
    at that point but it doesn't know how deep to make parents.

    It's given a displayName so that should be the deepest parent
    but I'm not sure how many things rely on displayName being fullPath

    So for now hacked in a showEmpty prefs but you have to refresh the view
    Otherwise can fix later.

[ ] handle scanning errors better?

    Every time we run we scan the folders and check for changes.
    That can take a long time if there are lots of folders
    and especially if they are remote. So let's say we lose
    the connection after we've started. I think the current
    code will end up marking all the existing photos as
    bad. We should notice the error and stop scanning that
    folder.

[ ] fix updating folders issue

    Every time prefs changes we send new folders to the thumber.
    If those folders don't exist then thumber will delete their
    thumbnails if it already has them loaded. That's bad.
    It should not delete folders unless they've been removed
    from prefs. Fix that.

[ ] speed up delete

    right now delete just deletes the local file and then it
    takes a few seconds to be noticed. Change it so the file
    is deleted AND delete it from the internal DB immediately
    assuming the delete succeeds

[ ] Look into switching to Axosoft/nsfw from chokidar

[ ] fix scanning speed

    for some reason scanning gets extremely slow. Electron seems
    to be doing nothing so it's not at all clear where the time
    is going or what's causing it run so slow.

    Looking into it, one thing, at least on Windows is calling
    readdir and then stat on each file is extremely slow. 5x or
    more slower than `dir`. One solution would be to try to
    implement windows native `FindFirstFile/FindNextFile` 
    solution which already contains all the data we need per
    file including size and attributes.

[ ] add loading message for image/video since it can take a while
    for archives and videos.

    Idea: Use CSS animation that blank or subtle?
    but after 1 second shows a spinner?

[ ] add at least one integration test (test that resizing works)
    just so there is a framework to start adding tests

[ ] fix the scroll skip

    I'm pretty sure this just means the size of items passed
    to react-list are slightly off.

[ ] profile scroll (as in fix the jank)

[ ] Make up,down,left,right in ImageGrid navigate grid

    up/down should go to image above or below current image
    left/right should go to image mostly left of or mostly right of image

    up/down should work like normal text editors? If you are in the 4th
    column and press up and the next row only has 1 image you should
    go to the 1st column. If you press up again and the next row
    has 5 images you could go to the 4th image? Except unlike a text editor
    our images are not in rows. Sooo? It should just jump to the
    min(currentColumn, maxColumn)?

    page-up (up a screen), page down (down a screen), shift-page-up(top),
    shift-page-down(bottom). Could I add brief home-home-home etc..?

    This is easier said than done because, given the
    columns of images going to the NEXT image is not
    visually clear. If one image is a few pixels
    taller or shorter than the next then the order of
    images displayed does not remotely match the order
    going to the NEXT image by index will go to.

    Looks like we need editor modes for actions?

    Issue is left is assigned to prev, right is assigned to next
    this works when in viewer.

    But in ImageGrid you really don't want them called next/prev
    you want up, down, left, right.

    That means you need to be able to assign left and right
    to next/prev when in viewer mode and left right when in
    imagegrid mode

[ ] change viewNdx to viewFilename and change currentImageNdx to just filename

    I feel like I did this before and took it out. Maybe I was just lazy.
    The issue right now is if images get inserted before the current index
    the index will be wrong. Next<->Prev should always go to the current image's
    next/prev.
    
    In other words, you're on image 100. You press right and it tries to display
    image 101 but if 50 images were inserted before image 100 you're now actually
    viewing image 150 but it goes to 101.

[ ] fix archive filename encoding

    archive internal filenames may not be utf-8. Maybe some
    library exists to guess the encoding

[ ] use different icon for rotate image vs rotate UI

[ ] toggle full zoom of current pane

[ ] add zoom reset

[ ] try to keep same images on screen as size or rotation changes.

    I'm not sure how to do this. Like one idea would be to try to find
    the top image that's visible and before changing size and after
    changing size try to scroll to where that image is. Should it be
    the top or maybe the middle?

    Need to decide what to do after a split of the viewer on returning
    to the imagegrid.

[ ] when exiting the viewer put the imagegrid at the location of the
    last viewed item? Should this be optional? I think this should be
    the default. As it is, if you split the viewer you're returned
    somewhere not even close to where you started. Or maybe you should
    at least turn to the last image you clicked on?

-- not-MVP --
================================================================================

[ ] fix deleting subfolders.

    After deleting subfolders sometimes a few remain.
    AFAIK the viewer is confused but the thumber is not. 
    Need to figure out why

[ ] fix updating pictures.

    Issue is I edited a picture to be a different aspect and
    for some reason it didn't get it right. It did the next
    image so it's probably a timing issue or something. It's
    possible it got the size from the cache so make sure
    the thumbnail loader is appending a cache breaker query
    and consider adding a cache breaker query to normal
    URLs and not just thumbnails. Maybe use the one
    from the thumbnail.

    But, this is not a priority because (1) I guess almost
    no one edits the files and (2) we should implement refresh
    and if we do you can also solve it that way.

[ ] explain hover stuff (made diagram, not happy with it)
[ ] Option to not continuously scan (default is continuous)

[ ] move menu accelerators to actions
[ ] add context menu to viewer images

[ ] restore imagegrid to current image
[ ] Save Scroll positions?

    Can't really because it takes time to load? Or maybe like browser
    scroll when you can? In other words, we restore, then load thumbs,
    need to be on 30th folder, 15th image but they have no loaded
    yet. They may NEVER load if they no longer exist or media not
    connected etc so when do we restore the position.

    could emit (maybe already emit?) 'done' from thumber when
    initial data is loaded and at that point try to use the previous
    scroll position IF the user has not already scrolled. (does the browser
    ignore the user if they've already scrolled?)



[ ] Save View State Layouts

    Note sure where in the UI this would fit but it would
    be nice to be able to save certain layouts with certain
    media in each layout. This is basically the (entire state of app)
    above except it would be for one window only and added to some
    list of saved layouts.

    Maybe a layout part of the state of a collection. So when you pick
    a collection it goes back to the state of that collection? Just
    trying to make the UI simple. Problem is when to save that
    state though? Always or only on request? Similarly when to load
    that state. When selecting a collection or get prompted (set to collection's last saved layout?)
    or ???

[ ] space shows image
[ ] Add auto-update
[ ] hidden folders

    *   Need to check by prefix so children are hidden
    *   Can't mark on FolderStateHelper because that gets re-written
    *   Can't use filters because need to rerun filter which means
        losing your place. You're scrolled down 200 folders, click,
        now you're back at the top.

    Solution: Mark on both folderstate AND keep list OR use list
    in folders and in imagegrids. Don't rerun filter. Also flatten
    FolderState.

[ ] Collections

    I'm trying to decide if I'd use collections myself or not.
    What I find is that if I load my entire media set it's
    just too much to navigate. Scrolling around all the folders
    and archives is too much.

    Until recently there was no UI for adding folders. Instead
    I'd launch from the command line and pass in the folders
    I wanted. This would limit the amount of stuff loaded
    to 20 or 30 folders generally.

    I thought that maybe collections would be one way to handle
    this. I could make collections of different sets of images.

    The UI I imagine is basically click to make a new collection.
    The UX for a collection looks almost exactly like the current
    UX for thumbnails.

    You could then split the view so one pane is showing your
    collection and another pane is showing everything else
    and drag and drop thumbnails to the collection. Drag
    a folder heading to insert the entire folder which
    would include subfolders.

    One complication is if you're dragging individual images
    you probably want them to show up in a single area
    instead of separated by folder as images are now. So,
    you'd need a way to create virtual folders in your
    collection.

    I wonder if I would use these collections. I feel like
    each day I want a different set. Today I want A, B and C
    Tomorrow I want B C and D. The next da y I want A C and E
    which seems too temporal for collections.

    Maybe another way is to just be able to hide trees of folders
    A simple UI might be a checkbox next to each folder. Un-check
    and the folder disappears. That means the folder's line in
    the folder would disappear as well since having 500 folders
    showing when you only want 30 is still problematic.
    Some other button on the toolbar would show the hidden folders
    again so you could un-hide them.

    This might be better as it's more temporal. Checking a few
    top level folders would quickly pair down the media

    If I do implement collections here's a few ideas

    [ ] right click thumbnail to add
    [ ] right click folder/title to add folder (should add live folder and tree)
    [ ] While viewing right click to add.
        Adds with current orientation, zoom, loop settings. This orientation should be
        relative (the viewer is already relative so probably no problem)
    [ ] right click thumbnail to remove (unless it's "all" playlist)
    [ ] make sure it skips missing files
    [ ] drag to reorder.
    [ ] drag from imagegrid pane to playlist pane
    [ ] drag from viewer pane to playlist pane
    [ ] drag from imagegrid to viewer pane
[ ] show video speed on toolbar
[ ] right click folder to start slideshow on just that folder tree
[ ] figure out how to flicker less when editing filter

    one idea, don't render results until a few moments, a few
    results, or all results are in, which ever comes with in
    say 100ms or 200ms

[ ] option to use orientation for width/height search?
[ ] show zoom amount

    either as a flash over image OR under zoom/behind zoom slider in toolbar

[ ] Fix focus issues
[ ] show slideshow state on toolbar
[ ] show loop markers on que
[ ] consolidate que code (the que above the video vs the que in the toolbar)
[ ] have toolbar zoom icon change based on zoom mode
[ ] have toolbar loop icon change based on loop mode
[ ] make zoom notched at 100%
[ ] Option to Reset (delete all data)

[ ] Option: Thumbnail generation size
[ ] add icons for zoom modes
[ ] consider scanning for existence

    User starts viewer, then turns on share, shouldn't have to
    restart viewer?

    Maybe just in prefs, if a folder does not exist
    then have have a "check again" button?

[ ] Plugins

    I'd like this to be very plugin friendly. Ideally I'd like
    to borrow the VSCode plugin installer if possible and just
    point it somewhere else although I don't want to have to
    run any servers.

    It seems like at a basic level MoPho-V should
    just a set of services. The basic services being

    1.  The thumbnail maker / DB service
    2.  A way to query the DB server (and add queries)
    3.  An Image / Video viewer
    4.  The plugin system
    5.  The preferences system (maybe like vscode just start with json)

    Separate the archive support into plugins

    Separate the video player into plugins so we can add other formats

    Make the main viewer a plugin

    1. Plugin the main viewer (3 panes, toolbar, folders, imagegrid)

[ ] Archive plugin API

    * open
    * getlist?
    * getfile
    * close

[ ] Video plugin API

    * open
    * seek
    * play
    * pause
    * getPosition
    * setPosition
    * getLength

[ ] UI plugin API

    * Menus?
    * Actions
    * Keymapper

[ ] Prefs API

    * get key
    * set key


  [ ] Plugins

[ ] Drag to move files/folders (rename)
[ ] option to go to next instead of loop for videos
    [ ] for playlist always go to next? User can add multiple times for loop
    [ ] 3 options. loop, go to next, go to next if longer than XX seconds
[ ] separate actual folder layout from display?
    Maybe this is a playlist? Let's say I have a folder of an artist
    and they have 5 subfolders each with 100 images. I want to be able
    to make another folder or playlist or something that just contains
    a few images from each folder.

    Where should playlists be stored? A separate list? A normal folder?
    Maybe just like a .jpg there's a .mopho-v-playlist so you can share
    them? Have to figure out how to keep paths working if they
    cross paths. Also if user moves a folder

[ ] figure out jank

    Even without `ReactList` it's really janky to scroll. Why?
    In that case there's just a large page of thumbnails. They're all
    static sizes, static positions, their images are just css background-img
    Images are shared. So, why does it jank?
    One idea, maybe it's `file://`. Try serving background files?

[ ] put separators between base folders?

    Like Picasa

[ ] prefs

    Just need to send prefs through IPC to update React state

    [X] pick folders
    [X] clear cache
    [X] set ff/rew amounts
    [ ] show base separators or merge?
    [ ] max height of thumbnail (this is to prevent tall images from messing up display)
    [ ] clip thumbs too big or shrink to fit (cover or constrain)
    [ ] set theme?
    [ ] set padding size
    [ ] min sizes

[ ] add default keys for Windows vs Mac vs Linux instead of just one set
[ ] command line clear cache
[ ] plugins

    grab code from Atom or VSCode if possible to make it easy to install
    published plugins.

    Ideas for plugins

    *   browse various sites, DL directly to your collection
    *   browse various sites, UL from your collection
    *   support more formats (avi/webp/tiff/tga)
    *   support more themes
    *   move basic support to plugins (images/videos/layout)
    *   check for dupes simple (check by size, then by content)
    *   check for dupes complex (check by perception)
    *   ask google images
        but really just want to pass the data to the browser
    *   upload image(s) to site ABC
    *   compress loop as webm and upload to site ABC

    Note: About browsing other sites, It's NOT ok to do that in electron. Electron does not get security updates like Chrome does so if you want to visit the live internet you really should be using Chrome or maybe the new Firefox. It's possible we could use a plugin in firefox
    or chrome and talk via IPC/RPC

[ ] generate gif thumbnails for gifs and videos?

    There's a bunch of issue here. One is they take tons of memory.
    Another is they take tons of time. Yet another is how stuff
    is organized currently is thumbnails share an image. (though the
    viewer doesn't care about that). Anyway, something to consider

[ ] add support for other video formats

    either enable in electron source or use ffmpeg in webassembly.
    Note: To play via ffmpeg in webassembly requires work to sync
    video and audio. Probably requires padding audio via Web Audio API

[ ] consider folder view

    for comic viewers - show covers. It's not clear what the UI should be.
    Maybe the folder view on the left becomes thumbnails and you just expand
    it? But then when you select something you'll need to shrink it to view.
    Maybe option to make viewers in separate windows? Double click a folder or
    right click ("open in new window") or Ctrl/Cmd click

[ ] allow collapsing of folder

    if you have tree view in folders maybe you should be able to collapse children?

[ ] allow collapsing of imagegrid

    Click the header to collapse an imagegrid

    save state? When viewing a large collection
    I find it's hard to navigate. How to fix?

    [ ] Use collections. User can add each folder/tre to a collection
        then select a collection in toolbar

    [ ] Allow collapsing by tree. Collapse a parent all children disappear

        next-prev need to work through this

[ ] allow imagegrid to be nested?
[ ] should have bottom ui for images?

    when showing video there are play controls.
    they disappear when showing an image.
    should some appropriate UI appear for images


NOTES
================================================================================

[ ] Should we change the file watcher stuff

    It started with a per folder watcher. The problem with
    a per folder watcher is the watcher holds a lock on the
    folder meaning (at least in Windows) you can't delete
    the folder.

    So, first try was switching to a tree based watcher and
    wrapping it in a bunch of stuff to make it look like
    folder based watchers.

    It's a big mess like 6 layers deep

    Maybe should refactor at a higher level to use the tree
    watcher instead of using fake folder watchers?

DONE
================================================================================

[X] Add toolbar icon for playback speed
[X] fix Modal on rotation
[X] fix context menu on rotation
[X] make it possible to delete archives
[X] make it possible to delete folders
[X] add optional confirmation and prefs
    [X] confirm on delete file y/n
    [X] confirm on delete archive y/n
    [X] confirm on delete folder y/n
    [X] confirm on delete tree (show tree?)
[X] switch to "move to trash", if fail use delete[X] add refresh options
[X] on start if no folders bring prefs to front
[X] Option: Thumbnail display size
[X] sort by filename or by date
[X] make filter more responsive

    I think the problem is filtering itself is fast
    so in a moment we filter pretty much everything
    but then react renders 300 or more images
    and/or computing column heights eats the time.
    Should check Profiler

    note: didn't actually do this but it seems responsive enough for now.
    A few recent changes seems to have made it more responsive.

[X] show progress on view

    [O] total folders/archives waiting to be scanned
    [X] maybe which ones are currently being scanned
    [O] maybe a list of them?
    [X] could make it so all folders are sent to view with flag about being updated or not.
        viewer could optionally show empty but pending folders.
        [ ] option to show empty folders
        [ ] option to show empty folders only if pending

[X] consider making a queue of folders to scan (fs.readdir) and only 
    scanning 1 to 2 at a time. Also consider putting folders with
    no folder data at the top of the queue

[X] fix password
[X] fix indented folder names
[X] fix scanning archives

    archives are currently only scanned if their size/time is
    different than their parent's record of them. Unfortunately
    the parents record is saved before they are scanned. So if you
    quit they'll never be scanned.

    Should pass an event back that they were scanned so parent
    can record when.

[X] consider making it when you close the last window it saves that state.

    As it is, on quit the window state is saved. When you close the last
    window we quit so we save a state with no windows which means the
    next time you launch the window starts in the default place.

[X] fix sort (sort doesn't seem right)
    sort by name I think is putting the folder that contains the file with the lowest
    name at top. It should sort by folders, the inside a folder by name.

[X] help
[X] web
[X] fix issue with slideshow targeting wrong pane
[X] figure out white flash on large collection?
[X] handle errors in viewer, requestMedia
[X] figure out why windows only scans first folder
[X] add option to show dates on hover (useful for debugging sort)
[X] figure out why delete does not work
[X] Fix issue that you can't move folders because watcher has them locked
   [X] Use tree based watcher? fails then just have refresh button
   [X] Check can delete folders (except root is fine)
[X] make menus disappear fullscreen on windows
[X] toolbar not at menubar
[X] check watch paths for parents
[X] fix toolbar when short
[X] save zoom and grid modes
[X] mark height = 0 as error
[X] sort by date
[X] in grid-fit mode add frame
[X] Why do we need to render both ImageGrids and Viewer?

    ATM, ImageGrids holds the state of displayed images so
    in order to view the NEXT or PREV image we ask ImageGrids.
    That could be fixed by moving that state up to VPAIR?

    Also, ImageGrids has a position, how far it has scrolled.
    That data would need to be moved up too so that it can
    be restored.

    Problem with restoring currently (though maybe not in reality).
    Open 2 tabs, start viewer in one, in other tab change the filter.
    The filter affects both tabs so ImageGrid under viewer needs
    to respond.

    Would be much faster to resize with no ImageGrid

[X] fix debounce of hiding thumber
[X] add pagesize to thumbnail data?
[X] search date:>2007 date:<2006
[X] Save layout
[X] fix date filter ??
[X] fix same react key issue in imagegrid (suspect it's from bad files)
[X] password
[X] figure out why bad thumbnails on large collection
[X] check jank (seems to be a macOS issue. Rebooted)
[X] fix archives AGAIN >:( (re-scanning fixed. Not sure what problem was)

[X] Save Window Size and Locations
    [X] Check if works if 2 -> 1 monitor
    [X] Switch to just making sure window is partly on screen?
[X] toolbar (or need to remove current one)
    [X] Toolbar should change depending on if it's a
        [X] ImageGrid
            [X] zoom
            [X] filter
            [X] help
        [X] Viewer
            [X] zoom
            [X] zoom mode
            [X] rotate
            [X] slideshow toggle
            [X] loop toggle
            [X] next/prev
            [X] (movie cue)?
            [X] exit?
            [X] help
    [X] filters (gif/vids/images) (just use search?)
    [X] thumb display size (just use zoom, if viewer or not viewer)
    [X] search
        [X] search should allow expressions
        [X] search foo*bar
        [X] search width:>1000  (note default would be width:>minSize)
        [X] search aspect:>.5
        [X] search aspect:landscape
        [X] search type:image
        [X] search size:>10mb
        [X] search "a b" (spaces)
        [X] search folder:party
        [X] search filename:greggman
[X] have folder-db add folderName and baseName
[X] make sure archive files have size/mtimeMs etc.
[X] add loading message?
[X] allow using key+modifier
[X] change key binding to wait for "Set"
[X] show missing (filter or prefs)
[X] Fix small/missing thumbnails SW/F
[X] Filter small/missing thumbnails
[X] fix archives
[X] tool bar at bottom option
[X] make it harder to bring down menus (can't)
[X] fix vid speed
[X] fix resizing viewer
[X] speed up resizing response
[X] Fix Thumber issue when fullscreen
[X] ignore folders that don't exist (when initializing thumber)
[X] ignore __MACOS folder in .zip file
[X] Live filter

    need to refactor to insert live.

    As it is it restarts. Instead it needs to just filter
    as it comes in.

    Thumber emits to DB
    DB with filter emits to FolderStateHelper
    If new filter re-emit

    Do we need DB? Can just ask Thumber to re-emit.

    Can just put filter on FolderStateHelper?

    Maybe That's step 1?

    Except asking the thumber to send all and filtering at
    FolderStateHelper is too slow to type in real time.

    So, use DB, ...? unsure what to do

    DB emits as things come in (again do I need DB)?
    LiveFilter accepts emits and queues for processing
      If emit matches folder in queue replace it
    Process folders in queue using something Like LiveFilter
    that only does a certain amount of work each tick.
    When folder is ready emit to FolderStateHelper

    Should we emit empty folders?

    Advantage: Will remove previous results for us
    Disadvantage: Might be simpler and more expected to just clear
      previous results (clear FolderStateHelper) and then
      refill. That way while typing we just see results immediately

    Problem, pending events needs to be cancels
[X] Use orientation for aspect search
[X] Refactor Viewer/Player

    The viewer/player pre-date React. As such they have all kinds
    of issues related to state. Things like stretchMode, rotation,
    zoom, etc are not based on React state and used in `render`.
    Rather they are just internal state. This makes it hard to
    reflect and/or change their state from outside (like from
    the toolbar).

    I should consider refactoring so as much as possible happens
    inside render (setting CSS for stretch/rotation/zoom etc) so
    that updating the state changes how things are rendered.

    The only property that can't be state is the currentTime
    it's updated by the browser.

[X] rotate ui, no toolbar, no folders, no toolbar + no folders
[X] Make hiding folders work
[X] Save Prefs
[X] figure out why it shows inspectors
[X] open cache in finder/explorer button in prefs
[X] prevent selection
[X] Option for no thumber
[X] Make UI for base folders
[X] on viewer if no folders suggest adding in prefs
[x] Fix context menu under separator
[x] move key config to prefs
[X] Fix sizing issue
[X] fix active tab indicator
   [X] add more obvious one
[X] add transitions to video controls
[X] show title with transition always?
[X] highlight thumbnail
[ ] fix panes

    [ ] if viewer is open keep it open
    [ ] split in middle
    [ ] remove current pane without losing other panes

        The problem is react is remaking the panes
        Maybe they need specific keys? Or maybe
        need to save components? No idea
[ ] hover (just needs `[data-tooltip]` css)
[x] hide video controls if showing image
[x] Make thumber show/hide if it's not in use
[x] open new panes

    [x] activate panes
    [x] close panes

[x] change keys to commands
[x] fix viewer on resize
[x] make gif and video marks be css
[x] add react list helper
[x] open new view windows

    need to figure out how to start views separate from thumber.

[x] handle archives

    [x] making thumbnails
    [x] handle viewing

        Plan is to unzip to blobs (already have code for this). Need to allow
        one blob in memory per viewer. Hard part is currently when you click
        a thumbnail the image/video that will be viewed already exists. In the
        archive case we need to trigger an archive decompression and only then
        view the blob for the selected image.


* FolderData is just a dump of readdir but filtered
  by stuff we care about (folders, images, videos, archives)
  and with thumbnail data added

  *  add isDirectory

  *  remove src/url/filename?

  *  keys should be just filename

  *  remove ndx?

  *  should we have `pages` to track .PNGs or derive it?

  *  should wrap 2D context stuff into classes that do that one operation?
     easier to mock/test

  *  need to handle bad archive. Archive should not be re-scanned if bad.
     seems like that should be stored in parent? Or should it be stored
     in data for archive itself? For example we for some reason we couldn't
     scan a folder should that data be stored in the folder or folder's parent?

Rejected
================================================================================

[ ] Consider refactoring so that zoom/grid/sort/filter is per view instead of per window

    zoom and grid are easy. sort and filter are semi-easy except the folder state
    has to move from app to vpair.

    no one would use this. You can use collections

[ ] Clicking on thumber thumbnail views that media?

    Not useful. Thumbnails don't stay long enough

[ ] option to rotate controls (for mouse vs trackpad)

    for the mouse this is going to require a software mouse pointer!!!

    As it is it only works for a laptop trackpad because rotating
    the laptop also rotates the trackpad so the only issues were
    the thumbwheel emulation and scrollbars.

    For a mouse though we need to move the pointer itself in
    different directions from the mouse input. The only way to
    really do that is to draw our own mouse pointer and handle
    generating fake mouse events some how.

    Handling touchscreens AND the mouse might be problematic

    Menus might need to be HTML based as well since we can't
    control the OS menus ... sigh

    this is just too much work for no purpose I think. Turing
    monitors is work where as turning laptops is easy so I think
    there is no point.

[ ] split same state.

    In other words when you split a view both splits should look the same,
    If it's viewing show the same view?

    If you're splitting you most likely want to view something else
    in the split so no reason to do this.

[ ] change filters to be more like expressions, allow using them as expressions for
    example

        (type:image & width:>256 & aspect:>1) | (type:video & width:<256)

    Should we just use parens as above? Should filters change to look like
    function calls?

        (type(image) & width(>256) & aspect(>1) | (type(video) & width(<256))

    Or maybe slightly lisp like (easier to implement)

        ((type image) & (width >256) & (aspect>1) | ((type video) & (width>256))

    Or maybe full lisp (too hard for users)

       (or (and (type image) (> (width) 256) (> (aspect) 1)) (and (type video) (> (width) 256)))

    Maybe infix with variables?

        ($type ~= 'image' & $width > 256 & $aspect > 1) | ($type ~= video & $width < 256)

    I get the impression no one would ever use them. I think they're fine as they are now
