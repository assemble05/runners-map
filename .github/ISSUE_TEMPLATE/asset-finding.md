---
name: Map asset finding
about: A human finding with the exact input and a regression fixture
title: "Map finding: "
labels: bug
---

## Observed and expected

What was observed in the map, and what should happen?

## Reproduction

Attach the unchanged source drawing or schematic, certificate and exact command/options.
Record the tool version and commit from the certificate.

## Regression fixture

Name the committed fixture path and test that reproduces the finding before the fix.
Assert its finding code or measured value. Preserve the failing source; do not edit a generated asset.

## Human acceptance, if any

Record the person's name, reason and date in `proof.accepted` if they explicitly accept the exception.
Keep `proof.ok` and the finding unchanged. An AI cannot supply this acceptance.
