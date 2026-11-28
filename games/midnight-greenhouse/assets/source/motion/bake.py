"""Bake registered sprite animations from the approved retro poses.

Offline dependencies: Pillow, numpy and scipy. Run this file directly.
The game loads baked WebP atlases and never executes the baker.
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

ART = Path(__file__).resolve().parents[2] / 'runtime' / 'art'
BASE = ART / 'retro/motion'
DEST = ART / 'retro/motion-library'
COLUMNS = 15
TAU = math.tau

# Centers of painted boots, accessories and plant crowns in normalized source-cell space.
# Outer values represent the reach of the part, leaving the hips or pot registered.
ANATOMY = {
    'walker': ((.38, .79), (.63, .80), (.29, .58), 1.0, 24),
    'courier': ((.34, .72), (.56, .74), (.73, .46), 1.35, 15),
    'porter': ((.49, .80), (.70, .79), (.35, .61), .76, 30),
    'raincoat': ((.34, .78), (.66, .79), (.58, .40), 1.04, 24),
    'mender': ((.37, .81), (.65, .78), (.35, .66), .91, 30),
    'keeper': ((.37, .81), (.64, .81), (.73, .53), .74, 36),
}
CROWNS = {
    'pitcher': ((.52, .41), (.43, .49), .95),
    'fern': ((.43, .34), (.74, .49), 1.18),
    'bramble': ((.51, .34), (.71, .56), 1.30),
    'orchid': ((.52, .39), (.67, .50), 1.12),
    'moss': ((.52, .43), (.37, .63), .64),
    'pod': ((.47, .37), (.65, .56), 1.04),
}

# Left contact, push-off, pass, swing and the mirrored right-foot cycle.
# During stance a planted boot moves to the right in cell space as the monster moves left.
GAIT = [
    (-.055, 0, .051, -.014), (-.030, .001, .042, -.047),
    (.004, 0, -.006, -.070), (.036, 0, -.046, -.034),
    (.055, -.014, -.051, 0), (.042, -.047, -.030, .001),
    (-.006, -.070, .004, 0), (-.046, -.034, .036, 0),
]

def ease(p):
    return p * p * (3 - 2 * p)

def curve(phase, *keys):
    """Piecewise eased motion through offsets at evenly spaced keys."""
    segment = min(len(keys) - 2, int(phase * (len(keys) - 1)))
    mix = ease(phase * (len(keys) - 1) - segment)
    return keys[segment] * (1 - mix) + keys[segment + 1] * mix

def foot_positions(phase):
    at = phase % 1 * len(GAIT)
    index = int(at)
    mix = ease(at - index)
    return tuple(a * (1 - mix) + b * mix for a, b in zip(GAIT[index], GAIT[(index + 1) % len(GAIT)]))

def clip_specs(unit_id, source):
    enemy = unit_id in ANATOMY
    specs = []
    for name, clip in sorted(source.items(), key=lambda item: item[1]['row']):
        duration = {
            'bite': 9, 'fire': 12, 'lash': 12, 'spark': 12,
            'release': 12, 'windup': {'fern': 12, 'bramble': 8}.get(unit_id, 12),
            'charge': 15, 'fall': 45,
        }.get(name, clip['durationTicks'])
        specs.append((name, name, duration, clip['loop'], 24 if name == 'walk' else 20 if clip['loop'] else 16, .32))
    if enemy:
        walk = ANATOMY[unit_id][-1]
        specs += [
            ('enter', 'walk', 12, False, 12, .58),
            ('biteWindup', 'bite', 6, False, 12, .66),
            ('biteRecovery', 'bite', 10, False, 12, .68),
            ('hitHeavy', 'hurt', 15, False, 15, .29),
            ('recover', 'restrained', 9, False, 10, .64),
            ('blocked', 'restrained', 30, True, 16, .20),
            ('stunned', 'restrained', 24, True, 16, .24),
            ('limp', 'walk', walk, True, 20, .33),
        ]
        if unit_id == 'keeper':
            specs.append(('phaseWalk', 'walk', walk, True, 24, .38))
    else:
        specs += [
            ('enter', 'idle', 12, False, 14, .66),
            ('recover', 'idle', 12, False, 12, .65),
            ('hitHeavy', 'hurt' if 'hurt' in source else 'idle', 15, False, 15, .28),
            ('wilt', 'idle', 36, True, 17, .21),
        ]
    return specs

class Mesh:
    def __init__(self, size, anchor):
        self.size = size
        self.anchor = anchor
        self.y, self.x = np.indices((size, size), dtype=np.float32) / size

    def envelope(self, center, width, height):
        return np.exp(-(((self.x - center[0]) / width) ** 2 + ((self.y - center[1]) / height) ** 2) * 2)

    def rig(self, unit_id, name, phase):
        tip = np.maximum(0, self.anchor - self.y) / self.anchor
        bend = tip ** 1.4
        lift = self.y * 0
        shift = self.x * 0
        if unit_id in ANATOMY:
            left, right, accessory, reach, walk = ANATOMY[unit_id]
            weight_l = self.envelope(left, .19, .19)
            weight_r = self.envelope(right, .18, .18)
            weight = self.envelope(accessory, .24, .28)
            if name in ('walk', 'limp', 'phaseWalk', 'enter'):
                stride_phase = phase * 12 / walk if name == 'enter' else phase
                dx_l, dy_l, dx_r, dy_r = foot_positions(stride_phase)
                if name == 'limp':
                    dx_r *= .57
                    dy_r *= .42
                intensity = (.40 + reach) * (1.17 if name == 'phaseWalk' else 1)
                stride = math.sin(TAU * stride_phase)
                shift += (weight_l * dx_l + weight_r * dx_r) * intensity
                lift += (weight_l * dy_l + weight_r * dy_r) * intensity
                lift += weight_l * (self.x - left[0]) * dx_l * 2.8
                lift += weight_r * (self.x - right[0]) * dx_r * 2.8
                shift += (weight * .035 + bend * .026) * stride * reach
                lift += weight * -.025 * math.cos(TAU * stride_phase) * reach
                if name == 'enter':
                    lift -= bend * curve(phase, .03, -.022, 0)
            elif name in ('biteWindup', 'bite', 'biteRecovery'):
                lean = {
                    'biteWindup': curve(phase, 0, .032, .070),
                    'bite': curve(phase, -.096, -.087, -.026),
                    'biteRecovery': curve(phase, -.027, .020, 0),
                }[name] * reach
                shift += bend * lean + weight * .9 * lean
                lift += bend * abs(lean) * math.copysign(.48, lean)
                shift += weight_l * min(lean, 0) * .45
            elif name in ('hurt', 'hitHeavy', 'brace', 'insulated'):
                heavy = name == 'hitHeavy'
                recoil = curve(phase, .008, .077 if heavy else .049, -.017, 0) * reach
                shift += bend * recoil + weight * 1.25 * recoil
                lift += (weight_r * -.024 if heavy else weight_l * -.008) * math.sin(math.pi * phase)
                if name == 'brace':
                    shift -= weight * curve(phase, 0, .086, .034, 0)
                    lift += weight * curve(phase, 0, -.046, .016, 0)
                    turn = curve(phase, 0, .33, .13, 0)
                    shift -= weight * (self.y - accessory[1]) * turn
                    lift += weight * (self.x - accessory[0]) * turn
            elif name in ('restrained', 'blocked', 'stunned', 'recover'):
                shake = math.sin(TAU * phase * (2 if name == 'stunned' else 1))
                shift += (weight * .03 + bend * .035) * shake
                if name == 'stunned':
                    lift += bend * .031 * abs(shake)
                elif name == 'recover':
                    lift += bend * curve(phase, .054, -.025, 0)
                else:
                    lift -= bend * .012 * math.cos(TAU * phase)
            elif name in ('heal', 'signal', 'phase'):
                swell = curve(phase, 0, .065, .050, 0)
                shift -= weight * swell
                lift -= (weight * .65 + bend) * swell
            elif name == 'fall':
                slide = curve(phase, 0, .032, .070, .078)
                shift += (bend + weight * .25) * slide
                lift += bend * slide * 1.25
        else:
            crown, action, reach = CROWNS[unit_id]
            top = self.envelope(crown, .27, .29)
            hand = self.envelope(action, .23, .25)
            base = np.maximum(0, tip - .06) ** 1.55
            if name in ('idle', 'wilt'):
                swing = math.sin(TAU * phase)
                shift += (top * .030 + base * .039) * swing * reach
                lift += hand * .016 * math.cos(TAU * phase + .8)
                if name == 'wilt':
                    shift -= top * .038
                    lift += (base + top) * .061
            elif name in ('windup', 'charge', 'gather', 'armed', 'arm'):
                draw = (math.sin(TAU * phase) if name == 'armed' else curve(phase, 0, .017, .071)) * reach
                shift -= (hand * 1.05 + top * .25 + base * .55) * draw
                lift += (hand * .37 + base * .63) * abs(draw)
            elif name in ('fire', 'lash', 'spark', 'release', 'burst'):
                follow = curve(phase, .045, .079, -.025, .014, 0) * reach
                shift += (hand * 1.15 + top * .75 + base * .35) * follow
                lift -= (hand * .66 + top * .38 + base * .35) * abs(follow)
            elif name in ('enter', 'brace', 'recover', 'mend'):
                compress = {
                    'enter': curve(phase, -.047, .074, -.031, 0),
                    'brace': curve(phase, 0, .065, .028, 0),
                    'recover': curve(phase, .054, -.034, .01, 0),
                    'mend': curve(phase, 0, -.058, -.023, 0),
                }[name]
                lift += (top * .56 + base * .73 + hand * .21) * compress
                shift += top * .022 * math.sin(TAU * phase)
            elif name in ('hurt', 'hitHeavy', 'fall'):
                recoil = curve(phase, 0, .070 if name == 'hitHeavy' else .043, -.014, 0)
                drop = curve(phase, 0, .02, .082) if name == 'fall' else abs(recoil) * .70
                shift -= (top * .75 + base * .82) * recoil
                lift += (hand * .45 + base * .85) * drop
        return ((self.y - lift) * self.size, (self.x - shift) * self.size)

def source_column(name, progress, count, enemy):
    # The two boots use one registered base for their continuous independent trajectories.
    if enemy and name in ('walk', 'phaseWalk', 'limp', 'enter'):
        return 1
    if name == 'biteWindup':
        progress *= .24
    elif name == 'bite':
        progress = .30 + .36 * progress
    elif name == 'biteRecovery':
        progress = .65 + .35 * progress
    return min(count - 1, int(progress * count))

def warp(source, coords):
    if not source[:, :, 3].any():
        return Image.fromarray(source)
    alpha = source[:, :, 3].astype(np.float32) / 255
    out = np.empty(source.shape, dtype=np.uint8)
    moved_alpha = map_coordinates(alpha, coords, order=1, prefilter=False)
    out[:, :, 3] = (moved_alpha * 255).round().astype(np.uint8)
    for i in range(3):
        color = map_coordinates(source[:, :, i] * alpha, coords, order=1, prefilter=False)
        out[:, :, i] = np.clip(color / np.maximum(moved_alpha, 1 / 255), 0, 255).astype(np.uint8)
    return Image.fromarray(out)

def shield_boot(pose):
    size = pose.width
    # The shield hides most of the forward foot in the source plate. Reuse the painted rear
    # boot beneath it, reflected toward the direction of travel, with a soft crop at the ankle.
    boot = pose.crop(tuple(round(value * size) for value in (.635, .744, .766, .855)))
    pixels = np.array(boot)
    y, x = np.indices((boot.height, boot.width), dtype=np.float32)
    mask = np.clip((1 - ((x / boot.width - .54) / .63) ** 2 - ((y / boot.height - .58) / .66) ** 2) * 3, 0, 1)
    pixels[:, :, 3] = (pixels[:, :, 3] * mask).round().astype(np.uint8)
    return Image.fromarray(pixels).transpose(Image.Transpose.FLIP_LEFT_RIGHT)

def porter_step(image, boot, phase, anchor):
    dx, dy, _, _ = foot_positions(phase)
    toe = boot.rotate(dx * 270, Image.Resampling.BICUBIC, expand=True)
    side = image.width
    x = round((.278 + dx * 1.80) * side - toe.width / 2)
    y = round(anchor + dy * 1.3 * side - toe.height + 1)
    layer = Image.new('RGBA', image.size)
    layer.alpha_composite(toe, (x, y))
    return Image.alpha_composite(layer, image)

def bake(unit_id, original):
    source = Image.open(ART / original['asset']).convert('RGBA')
    width, height = original['cell']
    size = 136 if unit_id == 'keeper' else 104
    anchor = [round(p * size / length) for p, length in zip(original['anchorPx'], (width, height))]
    clips = clip_specs(unit_id, original['clips'])
    frame_count = sum(clip[4] for clip in clips)
    sheet = Image.new('RGBA', (COLUMNS * size, math.ceil(frame_count / COLUMNS) * size))
    mesh = Mesh(size, anchor[1] / size)
    porter_boot = None
    if unit_id == 'porter':
        porter_boot = shield_boot(source.crop((width, 0, 2 * width, height)).resize((size, size), Image.Resampling.LANCZOS))
    reduced = {}
    index = 0
    for name, parent, duration, loop, count, still in clips:
        row = original['clips'][parent]['row']
        base_count = original['clips'][parent]['frameCount']
        poses = [np.asarray(source.crop((i * width, row * height, (i+1) * width, (row+1) * height))
                            .resize((size, size), Image.Resampling.LANCZOS)) for i in range(base_count)]
        reduced[name] = {'firstFrame': index, 'frameCount': count, 'durationTicks': duration,
                         'loop': loop, 'reducedFrame': round(still * (count - 1))}
        for i in range(count):
            phase = i / (count if loop else count - 1)
            pose = poses[source_column(name, phase, base_count, unit_id in ANATOMY)]
            if name in ('hurt', 'hitHeavy') and 32 < pose[:, :, 3].max() < 255:
                # Restore the painted body to full opacity during a live hit. Terminal poses
                # retain the art's fade; only a defeated unit should disappear.
                pose = pose.copy()
                pose[:, :, 3] = np.rint(pose[:, :, 3] * (255 / int(pose[:, :, 3].max()))).astype(np.uint8)
            rendered = warp(pose, mesh.rig(unit_id, name, phase))
            if porter_boot is not None and name in ('walk', 'limp', 'enter'):
                rendered = porter_step(rendered, porter_boot, phase * .4 if name == 'enter' else phase, anchor[1])
            sheet.paste(rendered, ((index % COLUMNS) * size, (index // COLUMNS) * size))
            index += 1
    asset = f'retro/motion-library/{unit_id}-motion.webp'
    sheet.save(ART / asset, quality=61, alpha_quality=84, method=6)
    entry = {'asset': asset, 'source': original['source'], 'cell': [size, size], 'anchorPx': anchor,
             'atlasSize': list(sheet.size), 'columns': COLUMNS, 'clips': reduced}
    if unit_id in ANATOMY:
        left, right, _, _, _ = ANATOMY[unit_id]
        front_toe = .278 + GAIT[0][0] * 1.80 if unit_id == 'porter' else left[0] + GAIT[0][0] * 1.4
        entry['feet'] = [round(front_toe * size - anchor[0]), round((right[0] + GAIT[4][2] * 1.4) * size - anchor[0])]
    print(unit_id, frame_count, len(clips), (ART / asset).stat().st_size, flush=True)
    return entry

if __name__ == '__main__':
    DEST.mkdir(parents=True, exist_ok=True)
    previous = json.loads((BASE / 'atlas.json').read_text())
    manifest = {'schemaVersion': 2, 'tickRate': 30,
                'units': {key: bake(key, entry) for key, entry in previous['units'].items()}}
    (DEST / 'atlas.json').write_text(json.dumps(manifest, indent=2) + '\n')
