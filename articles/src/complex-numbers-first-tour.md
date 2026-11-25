---
title: Complex Numbers: A First Tour
date: 2026-11-24
summary: What complex numbers are, how they behave in the plane, and how a one-line rule turns them into Julia sets. With a short Python program.
tags: complex numbers, julia set, python, fractals
artworks: art_013, art_017
series: The Mathematics Behind the Art
part: 1
draft: true
---

*This is a TEST article, written to try out the article system (formulas, code, images, PDF). Replace it with your own text.*

Many of my images start from a very small piece of mathematics: a rule applied to **complex numbers**, again and again. This article explains the vocabulary you need, without proofs, and ends with a program you can run.

## What is a complex number?

The real numbers fill a line. Complex numbers add a second direction. Everything starts from one new symbol, the **imaginary unit** $i$, defined by

$$i^2 = -1.$$

A complex number is a pair of real numbers $a$ and $b$ written as

$$z = a + bi.$$

Here $a$ is the **real part** and $b$ is the **imaginary part**. Because there are two numbers, we can draw $z$ as a point $(a, b)$ in the **complex plane**: the real axis runs horizontally, the imaginary axis vertically. This is the key idea for art: *every pixel of an image can be treated as a complex number*.

## Size and direction

A point in the plane has a distance from the origin and a direction.

- The **modulus** is the distance: $|z| = \sqrt{a^2 + b^2}$.
- The **argument** is the angle $\theta$ measured from the positive real axis. In code it is `atan2(b, a)`.

Together they give the **polar form**

$$z = r(\cos\theta + i\sin\theta) = r\,e^{i\theta}, \qquad r = |z|.$$

The second equality is **Euler's formula**, $e^{i\theta} = \cos\theta + i\sin\theta$. It is the bridge between exponentials and rotations.

| Operation | Formula | Geometric meaning |
|---|---|---|
| Addition | $(a+bi) + (c+di) = (a+c) + (b+d)i$ | move the point (vector addition) |
| Multiplication | $r_1 e^{i\theta_1} \cdot r_2 e^{i\theta_2} = r_1 r_2\, e^{i(\theta_1+\theta_2)}$ | multiply the sizes, add the angles |
| Conjugate | $\bar z = a - bi$ | mirror image across the real axis |
| Squaring | $z^2 = r^2 e^{2i\theta}$ | square the size, double the angle |

Multiplication is the interesting one: multiplying by a complex number *scales and rotates* the plane at the same time. That is why simple formulas produce spirals.

## Iteration: where the art begins

Pick a constant $c$ and a starting point $z_0$. Then repeat

$$z_{n+1} = z_n^2 + c.$$

The list $z_0, z_1, z_2, \dots$ is the **orbit** of $z_0$. Two things can happen: the orbit stays bounded forever, or it runs away to infinity. For $|c| \le 2$ there is a handy rule: once some $|z_n|$ is larger than $2$, the orbit is guaranteed to escape.

- The **filled Julia set** $K_c$ is the set of starting points $z_0$ whose orbit never escapes. Its boundary is the **Julia set** $J_c$.
- The **Mandelbrot set** is the set of constants $c$ for which the orbit of $z_0 = 0$ stays bounded.

The two are linked: $J_c$ is one connected piece exactly when $c$ belongs to the Mandelbrot set.

## From numbers to pixels

Points inside $K_c$ are usually painted black. All the colour comes from the points that *escape*: we count how many steps $n$ they need. Counting whole steps gives ugly bands, so we smooth the count with

$$\nu = n + 1 - \log_2\!\big(\ln |z_n|\big),$$

where $z_n$ is the first value beyond a large bailout radius. The number $\nu$ then goes through a colour palette.

## The program

The program below follows exactly these steps. It needs `numpy` and `pillow` (`pip install numpy pillow`).

@code julia_set.py

![Julia set for c = -0.8 + 0.156i, produced by julia_set.py](img/julia-example.png)

The three marked sections of the code are the whole story: a complex number per pixel, the iteration, and the palette. Everything else is bookkeeping.

## Things to try

Change `C` at the top of the program and run it again. Some classic values:

1. `-0.4 + 0.6j`: a swirling, connected shape.
2. `0.285 + 0.01j`: delicate spirals.
3. `-0.70176 - 0.3842j`: fine, almost lace-like detail.

Then change the exponent, replace $z^2$ by $z^3$, or change the palette. Most of my images came from experiments of exactly this kind.
