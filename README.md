# Yomburlizer
Small node app that takes a Youtube playlist id as input and outputs a xml RSS feed file with the audios of all the videos in it, for podcasting.

## Installation

Just `git clone` the repository and do `node install` on the project directory.

## Requirements

You need the `youtube-dl` application installed and available on your path for Yomburlizer to work.

Also you'll need to create a Youtube API key and write it in the `./config.json` config file.

## Usage

Fill in the details of your feed in the `config.json` configuration file:

`apiKey`: Put your Youtube api key between the empty quotes.

`playlistId`: Change this value to the id of the Youtube playlist that you want to convert to RSS feed.

`thumbnail`: Size of the image thumbnails. Possible values: `"default"`, `"medium"`, `"high"`.

`channelTitle`, `channelURL`, `channelDescription`: These values will transfer to your channel feed.

`outputPath`: The output path of the output xml feed file, by default `"./rssFileOutput.xml"`

`language`: Site language (abbreviation) (example: `"en"`)

## How it works

The program first fetches the playlist info and the uses youtube-dl to obtain the only-audio link for each video. As this is a long operation –the more videos, the longer–, it displays a progress bar meanwhile.

Finally it produces the output RSS 2.0 xml file with the links to all the audios. It includes thumbnails and the descriptions from the video.

