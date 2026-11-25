"""Draw a Julia set with smooth colouring.

Requires:  pip install numpy pillow
Run:       python julia_set.py
Output:    julia_set.png
"""
import numpy as np
from PIL import Image

# --- parameters you can play with --------------------------------------
C = -0.8 + 0.156j      # the constant c in  z -> z*z + c
WIDTH, HEIGHT = 800, 600
MAX_ITER = 200         # how many steps we follow each starting point
BAILOUT = 50.0         # |z| above this means "escaped"
EXTENT = 1.6           # half-height of the plotted region of the plane
# -----------------------------------------------------------------------

# 1. One complex number per pixel: x runs along the real axis, y along the imaginary axis.
x = np.linspace(-EXTENT * WIDTH / HEIGHT, EXTENT * WIDTH / HEIGHT, WIDTH)
y = np.linspace(-EXTENT, EXTENT, HEIGHT)
z = x[None, :] + 1j * y[:, None]

# 2. Iterate z -> z^2 + c, remembering when (and how smoothly) each point escapes.
steps = np.zeros(z.shape)             # smooth escape time
alive = np.ones(z.shape, dtype=bool)  # points that have not escaped yet
for i in range(MAX_ITER):
    z[alive] = z[alive] ** 2 + C
    escaped = alive & (np.abs(z) > BAILOUT)
    steps[escaped] = i + 1 - np.log2(np.log(np.abs(z[escaped])))
    alive &= ~escaped

# 3. Turn the numbers into colours: a cosine palette, black for points that never escape.
t = steps / 12.0
palette = np.stack([0.5 + 0.5 * np.cos(2 * np.pi * (t + shift)) for shift in (0.00, 0.10, 0.25)], axis=-1)
palette[alive] = 0.0
Image.fromarray((palette * 255).astype(np.uint8)).save("julia_set.png")
print("saved julia_set.png")
