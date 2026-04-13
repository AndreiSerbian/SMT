# Fix: Loop-Safe Slider Reset in `updateSliderPhotos()`

## Change

**File:** `js/services/swiperService.js` — after `swiper.update()` (line 156), add loop-safe reset:

```js
swiper.update();

if (swiper.params?.loop && typeof swiper.slideToLoop === 'function') {
  swiper.slideToLoop(0, 0);
} else {
  swiper.slideTo(0, 0);
}
```

Single block addition. No other files changed.

&nbsp;

Apply this fix and confirm after patching:

&nbsp;

1. First click on inactive color button switches product/color and always opens image 1

2. Second click on already active color button still navigates to PDP

3. No regression for homepage slider pagination/navigation

4. No changes to PDP or modal slider behavior.