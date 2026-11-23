"""Trace the Met's public-domain JP1847 print into a new exhibition poster.

Pass the downloaded JP1847 main image as the first argument. The independently
inked contours, page crops and paper stock are rebuilt without an image model.
Source: https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image
Requires OpenCV, NumPy and Pillow.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

DEST = Path(__file__).resolve().parent
PAPER = np.array([246, 239, 218], dtype=np.float32)
source = np.asarray(Image.open(sys.argv[1]).convert("RGB").resize((1440, 968)))
rng = np.random.default_rng(1847)


def impression(mask, minimum):
    paths, tree = cv2.findContours(mask.astype(np.uint8), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    plate = np.zeros(mask.shape, dtype=np.uint8)
    if tree is None:
        return plate
    # Preserve holes in the foam and the tiny curled fingertips of each breaker.
    levels = []
    for index, path in enumerate(paths):
        parent = tree[0, index, 3]
        level = 0 if parent < 0 else levels[parent] + 1
        levels.append(level)
        if cv2.contourArea(path) >= minimum:
            contour = cv2.approxPolyDP(path, .48, True)
            cv2.drawContours(plate, [contour], -1, 255 if level % 2 == 0 else 0, -1, cv2.LINE_AA)
    return plate.astype(np.float32) / 255


def cut_blocks():
    red, green, blue = cv2.bilateralFilter(source, 5, 18, 14).astype(np.float32).transpose(2,0,1)
    y, x = np.indices(red.shape, dtype=np.float32) / 2
    # Separate the grey horizon from the blue water and the warm sides of the boats.
    sky = (y < np.interp(x, [432,550,630,720], [275,284,239,184])) & (x > 432)
    boat = (y > 265) & (red - blue > 28) & (green < 210) & (red - green > 12)
    blue_ink = (blue - red > 1) | (green - red > 3)
    grey = (~blue_ink) & (~boat) & (green < 179) & (y > 248) & (y < 373)
    key = ((blue_ink & (red < 99) & (green < 128)) | (green < 87)) & ~sky
    middle = (blue_ink & (green < 178)) & ~sky
    pale = blue_ink & ~sky
    blocks = [(grey, [160,157,131], 6), (boat, [205,158,98], 4),
              (pale, [157,185,182], 4), (middle, [78,121,133], 3), (key, [24,56,80], 1.3)]
    stock = np.broadcast_to(PAPER, source.shape).copy()
    blank = ((x < 71) & (y < 151)) | ((x < 33) & (y < 161))
    for mask, color, minimum in blocks:
        opacity = impression(mask & ~blank, minimum)[:,:,None]
        stock = stock * (1-opacity) + np.asarray(color) * opacity
    return stock.astype(np.uint8)


def poster(stock, mobile):
    width,height = (820,1020) if mobile else (1840,774)
    to_x = [-52,360,566,666,844,1035] if mobile else [-35,545,840,984,1400,1848]
    yy, xx = np.indices((height,width),dtype=np.float32)
    original_x = np.interp(xx, to_x, [0,280,428,480,600,720]).astype(np.float32)
    drift = np.maximum(original_x-455,0)
    original_y = (yy-(410 if mobile else 0)-drift*(.38 if mobile else .88))/(1.68 if mobile else 1.67) + 24
    art = cv2.remap(stock, original_x*2, original_y*2, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    # Re-ink a circular vermilion block in the empty sky of the new composition.
    cx,cy,r = (633,162,112) if mobile else (1510,178,143)
    angle = np.arctan2(yy-cy,xx-cx)
    radius = r + .95*np.sin(angle*19)+.4*np.cos(angle*37)
    disc = np.clip(radius-np.hypot(xx-cx,yy-cy)+.5,0,1)
    sun = np.array([195,78,55])+ np.sin(yy*.035)[:,:,None]*1.65
    art = art*(1-disc[:,:,None])+sun*disc[:,:,None]
    noise = rng.normal(0,2,(height,width))
    streak = cv2.resize(rng.normal(0,1,(max(4,height//6),max(4,width//90))).astype(np.float32),(width,height),interpolation=cv2.INTER_CUBIC)
    art += (noise + streak*1.65 + np.sin(yy*.78)*.48)[:,:,None]
    Image.fromarray(np.uint8(np.clip(art,0,255))).save(DEST/('tide-portrait.webp' if mobile else 'tide.webp'),quality=91,method=6)


if __name__ == "__main__":
    block = cut_blocks()
    poster(block,False)
    poster(block,True)
