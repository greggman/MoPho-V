# Developement

## Setup

Install [node.js](https://nodejs.org).

    git clone https://github.com/greggman/MoPho-V
    cd MoPho-V
    npm install

## Random notes on development

First off the code is a mess. If you feel like schooling me on how to cleaning things up, PRs welcome.

## Common commands

    npm run watch                        # continuous build
    npm run start -- path1 path2 path3   # run in dev
    npm run startp -- path1 path2 path3  # run in production
    npm run start -- --help              # shows options
    rpm run unit-tests                   # run unit tests
    rpm run integration-tests            # run integration tests (not working)
    rpm run test                         # run all tests
    npm run build                        # build javascript from 'src' to 'out' folder

### run tests with debugging

    npm run unit-tests --inspect --inspect-brk [--grep=<testname>]

now go to [about:inspect](about:inspect) in chrome and click the link

## Use --inspector

While you can manually open the inspector for the main window and the preferences
window it can be convenient to have them opened automatically using `--inspector` during development.

For example to open the inspector for both the main window and for the thumber
you'd use `--inspector=thumber|index`. The argument to inspector is just a regular expression to
filter the URL for the windows. Current windows include `thumber`, `index`, `pref`, and `password`.
To just open all windows use `--inspector=".*"`. I find it's useful
to only auto open the inspectors I need since shuffling all the windows can be problematic.

Note because `|` means pipe in shells you need to either escape or quote it. Examples

macos:

```
npm run start -- "--inspector=thumber|index" --user-data-dir=temp\delme-mopho-v test\data
```

windows:

```
npm run start -- --inspector=thumber^^^|index --user-data-dir=temp\delme-mopho-v test\data
```

## Opening the inspectors manually

For windows that are always visible you can choose to open the developer tools from the menus. For windows
that are not always visible you can use the `--inspector` option above. If the program is already running
then open a developer tools window and copy and paste this line into the console to open the devtools for
other windows

```
require('electron').remote.BrowserWindow.getAllWindows().forEach((window) => { window.webContents.openDevTools(); });
```

## set the DEBUG environment variable

Setting the `DEBUG` environment variable works like the npm debug module.
Every component that logs has a prefix. Only prefixes that match the `DEBUG`
environment variable will print their logs. So for example `DEBUG=Viewer,Imagegrids`
will output only from the `Viewer` and `ImageGrids` components. `*` turns on
all debugging.

Examples:

macos:

```
DEBUG=* npm run start -- "--inspector=thumber|index" --user-data-dir=temp\delme-mopho-v test\data
```

windows:

```
cmd /S /C "set "DEBUG=*" & npm run start -- --inspector=thumber^^^|index --user-data-dir=temp\delme-mopho-v test\data"
```

# Program Structure

When starting the program it opens 3 windows but hides 2 of them.
The 3 windows are:

*   *prefs*

    responsible for loading and saving preferences

*   *thumber*

    responsible scanning folders, generating thumbnails, loading and
    saving meta data about the folders, decompressing archives.

*   *index*

    The main UI.

There are 2 other windows.

*   *help*

    The help/about page

*   *password*

    the password window, only opened at program start if a password exists.

## command line options

# --list-cache-files

When debugging it can be useful to find the meta data file for the corresponding
folder. To do this you can print the associations with `--list-cache-files`.

For example to find the cache file for a folder called `test`

    npm run start -- --list-cache-files | grep test

produces

    {"version":2,"foldername":"/Users/greggman/src/MoPho-V/test/data/images",
    "filename":"/Users/greggman/temp/delme-mopho-v/folder-a6973b090a343768914d163d292fb32f8b4b39090dd7ab8b33f7dd28e0a6886f.json"},

## --user-data-dir

For testing thumbnail and/or meta data generation you specify a folder
for where meta-data and thumbnails are stored with `--user-data-dir=<path-to-folder>` which makes them easy to delete to
test again. for example `rm <path-to-folder>/folder*`.

## --compare-folders-to-cache

This is for debugging. It scans all the folders either in prefs
or specified on the command line and then checks that there is
metadata for every file and folder found during the scan.

## --delete-folder-data-if-no-files-for-archive

If used with `--compore-folders-to-cache` then, if the metadata
for an archive shows zero files the metadata will be deleted
which means the next time you run MoPho-V those archives
will be rescanned.

**Note:** there was a bug where archives were sometimes
marked as scanned but had not actually been scanned. This 
options was added to fix that bug. As that bug has been fixed 
this feature is probably not useful.

## --max-parallel-readdirs

This set the maximum number of parallel readdir calls. There's
an assumption that lots of parallel calls would be slow. This
option is mostly hear to easily test different values in
different situations. This is also useful for debugging by s
etting it to 1 and setting `--readdirs-throttle-duration`.

## --readdirs-throttle-duration

This is useful for debugging folder status by setting
it to say 2000 (2 seconds) and setting `-max-parallel-readdirs=1`
you can see folders marked as "checking" etc...
