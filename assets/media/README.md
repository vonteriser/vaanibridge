# Prototype video and team portraits

## Demo video (Page 5)

Drop the walkthrough here, for example `demo.mp4` and `demo-poster.jpg`. Then run:

```js
VaaniBridgeHooks.mountDemoVideo({
  videoSrc: './assets/media/demo.mp4',
  posterSrc: './assets/media/demo-poster.jpg',
  chapters: [0, 24, 61, 98, 140], // start time in seconds for each of the 5 chapters
});
```

The "[RELEASING SOON]" card disappears, both panels return to full brightness, and each chapter row seeks the video.

## Team portraits (Page 6)

Square or 4:5 portrait photos work best (about 600 × 750 px). Then run:

```js
VaaniBridgeHooks.setTeamPhotos({
  Daksh: './assets/media/daksh.jpg',
  Shivang: './assets/media/shivang.jpg',
  Vaibhav: './assets/media/vaibhav.jpg',
  Divyansh: './assets/media/divyansh.jpg',
  Shivansh: './assets/media/shivansh.jpg',
});
```

Members you leave out keep the Blank Tree silhouette.
