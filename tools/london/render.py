"""London Calling set: Blender (bpy, Cycles CPU) sprite renders.
Run: python3.13 tools/london/render.py <out_dir> [name ...]
Every model is a stylised, bevelled, procedural build lit by a warm key + cool rim; output is a
transparent PNG per model (and per camera). No external assets.
"""
import bpy, math, sys, os
from mathutils import Vector

OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/london'
ONLY = sys.argv[2:]
os.makedirs(OUT, exist_ok=True)


def reset(res=(768, 768), samples=40):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = samples
    sc.cycles.device = 'CPU'
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.55, 0.62, 0.8, 1); bg.inputs[1].default_value = 0.55
    return sc


def mat(name, rgb, rough=0.45, metal=0.0, emit=None, strength=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    return m


def hexc(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x ** 2.2 for x in c)  # sRGB -> linear


def bevel(o, w=0.03, seg=3):
    m = o.modifiers.new('b', 'BEVEL'); m.width = w; m.segments = seg; m.limit_method = 'ANGLE'
    return o


def box(name, loc, size, m, bw=0.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); bevel(o, bw); return o


def cyl(name, loc, r, h, m, rot=(0, 0, 0), v=32, bw=0.02):
    bpy.ops.mesh.primitive_cylinder_add(location=loc, radius=r, depth=h, vertices=v, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); bevel(o, bw); return o


def sph(name, loc, r, m, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(location=loc, radius=r, segments=48, ring_count=24)
    o = bpy.context.object; o.name = name; o.scale = scale; o.data.materials.append(m)
    bpy.ops.object.shade_smooth(); return o


def cone(name, loc, r1, r2, h, m, v=32, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(location=loc, radius1=r1, radius2=r2, depth=h, vertices=v, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); return o


def light(kind, loc, energy, color=(1, 1, 1), size=3):
    bpy.ops.object.light_add(type=kind, location=loc)
    l = bpy.context.object; l.data.energy = energy; l.data.color = color
    if kind == 'AREA': l.data.size = size
    l.rotation_euler = (Vector((0, 0, 0.8)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return l


def cam(loc, target, ortho=None, lens=60):
    bpy.ops.object.camera_add(location=loc)
    c = bpy.context.object
    c.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    if ortho: c.data.type = 'ORTHO'; c.data.ortho_scale = ortho
    else: c.data.lens = lens
    bpy.context.scene.camera = c; return c


def stage(key=(4, -5, 6), rim=(-5, 3, 4)):
    light('AREA', key, 650, (1.0, 0.92, 0.8), 4)
    light('AREA', rim, 380, (0.65, 0.78, 1.0), 4)
    light('AREA', (0, -6, 1), 120, (1, 1, 1), 5)


def go(name):
    sc = bpy.context.scene
    sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', name)


RED, BLUE, WHITE, GOLD, STONE, BLACK = hexc('c8102e'), hexc('012169'), hexc('f4f1ea'), hexc('d9a928'), hexc('c9b98f'), hexc('15151a')


def bus():
    reset((1024, 640))
    red, glass, tyre, wh = mat('red', RED, .25), mat('glass', hexc('2b3b52'), .08), mat('tyre', BLACK, .8), mat('w', WHITE, .5)
    box('lower', (0, 0, .9), (4.6, 1.5, 1.0), red, .1)
    box('upper', (-.1, 0, 1.95), (4.2, 1.45, 1.0), red, .1)
    box('roof', (-.1, 0, 2.5), (4.3, 1.5, .1), red, .05)
    for i in range(5):  # upper windows
        box('uw', (-1.7 + i * .85, 0, 2.0), (.65, 1.52, .5), glass, .02)
    for i in range(4):
        box('lw', (-1.55 + i * .85, 0, 1.05), (.6, 1.52, .4), glass, .02)
    box('door', (1.75, 0, 1.0), (.5, 1.52, .75), glass, .02)
    box('band', (0, 0, 1.45), (4.62, 1.52, .09), wh, .02)
    box('ad', (-.4, 0, .6), (2.2, 1.52, .32), mat('ad', hexc('f5d142'), .4), .02)
    for x in (-1.5, 1.45):
        for y in (-.72, .72):
            cyl('tyre', (x, y, .38), .38, .22, tyre, (math.pi / 2, 0, 0), 32, .04)
            cyl('hub', (x, y * 1.05, .38), .18, .24, mat('hub', hexc('b0b4bd'), .3, 1), (math.pi / 2, 0, 0), 24, .02)
    box('ground', (0, 0, -.001), (10, 4, .002), mat('sh', BLACK, 1))
    bpy.data.objects['ground'].hide_render = True
    stage((3, -6, 5)); cam((5.2, -6.6, 3.1), (0, 0, 1.2), None, 42); go('bus')


def phonebox():
    reset((640, 900))
    red, glass, gold = mat('r', RED, .22), mat('g', hexc('cfe6f2'), .02, 0), mat('gold', GOLD, .3, 1)
    glass.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = .35
    box('base', (0, 0, .15), (1.15, 1.15, .3), red, .04)
    for x, y in ((.5, .5), (-.5, .5), (.5, -.5), (-.5, -.5)):
        box('post', (x, y, 1.55), (.1, .1, 2.6), red, .02)
    for z in (.4, 1.0, 1.6, 2.2):
        for s in (1, -1):
            box('bar', (0, .5 * s, z), (1.0, .06, .05), red, .01)
            box('bar2', (.5 * s, 0, z), (.06, 1.0, .05), red, .01)
    for s in (1, -1):
        for y in (.48,):
            box('pane', (0, y * s, 1.3), (.95, .03, 1.8), glass, .005)
            box('pane', (y * s, 0, 1.3), (.03, .95, 1.8), glass, .005)
    box('top', (0, 0, 2.95), (1.25, 1.25, .18), red, .05)
    cone('dome', (0, 0, 3.12), .72, .35, .2, red, 4, (0, 0, math.pi / 4))
    box('sign', (0, 0, 2.78), (.95, 1.3, .22), mat('sign', hexc('fff6dd'), .4, 0, hexc('ffeeb0'), 1.5), .02)
    box('crown', (0, -.66, 2.78), (.28, .02, .18), gold, .005)
    stage(); cam((4.2, -6.2, 3.6), (0, 0, 1.55), None, 62); go('phonebox')


def bigben():
    reset((520, 1000))
    st, gold, dark, face = mat('st', STONE, .55), mat('gold', GOLD, .28, 1), mat('roof', hexc('2e4a46'), .35), mat('face', hexc('fff6dc'), .4, 0, hexc('ffe9a8'), 1.2)
    box('base', (0, 0, 1.3), (2.0, 2.0, 2.6), st, .05)
    box('shaft', (0, 0, 4.4), (1.6, 1.6, 3.6), st, .05)
    for x, y in ((.8, .8), (-.8, .8), (.8, -.8), (-.8, -.8)):
        box('buttress', (x, y, 4.4), (.2, .2, 3.8), st, .03)
    for z in (3.4, 4.6):
        for x, y in ((0, -.8), (.8, 0)):
            box('win', (x, y, z), (.28 if x == 0 else .02, .02 if x == 0 else .28, .7), mat('wn', hexc('2a2f3a'), .5), .01)
    box('clockbox', (0, 0, 6.9), (2.0, 2.0, 2.0), st, .05)
    for rot, p in (((math.pi / 2, 0, 0), (0, -1.02, 6.9)), ((math.pi / 2, 0, math.pi / 2), (1.02, 0, 6.9))):
        cyl('face', p, .78, .06, face, rot, 48, .01)
        cyl('ring', (p[0] * 1.002, p[1] * 1.002, p[2]), .86, .05, gold, rot, 48, .01)
        for k in range(12):
            a = k * math.pi / 6
            if rot[2] == 0: box('tick', (math.sin(a) * .66, p[1] - .04, 6.9 + math.cos(a) * .66), (.05, .03, .12), dark, .005, (0, a * 0, 0))
        hand = box('hand', (0, p[1] - .05, 6.9 + .25) if rot[2] == 0 else (p[0] + .05, 0, 6.9 + .25), (.06, .03, .6) if rot[2] == 0 else (.03, .06, .6), dark, .005)
    box('belfry', (0, 0, 8.3), (1.7, 1.7, .9), st, .05)
    cone('spire', (0, 0, 9.7), 1.05, .08, 1.9, dark, 4, (0, 0, math.pi / 4))
    cone('tip', (0, 0, 10.9), .06, .005, .6, gold, 8)
    for x, y in ((.8, .8), (-.8, .8), (.8, -.8), (-.8, -.8)):
        cone('pin', (x, y, 8.95), .14, .01, .6, gold, 8)
    stage((5, -6, 9), (-5, 4, 8)); cam((0, -26, 5.5), (0, 0, 5.2), 12.5); go('bigben')


def guard():
    reset((640, 800))
    red, black, skin, gold, wht, fur = mat('tun', hexc('c8102e'), .5), mat('blk', BLACK, .6), mat('skin', hexc('e8b99a'), .5), mat('gold', GOLD, .3, 1), mat('wh', WHITE, .5), mat('fur', hexc('1b1b20'), .95)
    sph('torso', (0, 0, 1.0), .72, red, (1, .72, 1.05))
    sph('head', (0, 0, 2.0), .43, skin)
    for x in (-.15, .15):
        sph('eye', (x, -.38, 2.05), .05, black)
    sph('mouth', (0, -.4, 1.85), .05, mat('m', hexc('b0605a'), .6), (2.5, .5, .8))
    cyl('hatband', (0, 0, 2.26), .46, .1, black, (0, 0, 0), 32)
    sph('bearskin', (0, 0, 2.75), .7, fur, (.95, .95, 1.1))
    cyl('strap', (0, 0, 1.75), .44, .06, gold, (0, 0, 0), 32)
    for z in (1.15, .95, .75, .55):
        sph('btn', (0, -.52, z), .06, gold)
    box('belt', (0, 0, .5), (1.5, 1.0, .12), wht, .03)
    for x in (-.78, .78):
        sph('arm', (x, 0, .95), .24, red, (1, 1, 1.5))
        sph('hand', (x, -.05, .4), .15, wht)
    box('legs', (0, 0, -.1), (1.0, .7, .5), mat('trousers', hexc('1f2a44'), .6), .05)
    stage(); cam((0, -9, 2.2), (0, 0, 1.45), None, 62); go('guard')


def towerbridge():
    reset((1280, 640))
    st, blue, gold, dark = mat('st', hexc('a9b3c4'), .5), mat('bl', hexc('3b6fb8'), .35, .6), mat('go', GOLD, .3, 1), mat('roof', hexc('2e4a46'), .35)
    for x in (-2.6, 2.6):
        box('tower', (x, 0, 2.2), (1.5, 1.5, 4.4), st, .06)
        box('tower2', (x, 0, 4.7), (1.25, 1.25, .9), st, .05)
        for dx, dy in ((.62, .62), (-.62, .62), (.62, -.62), (-.62, -.62)):
            cone('turret', (x + dx, dy, 5.2), .22, .02, 1.0, dark, 8)
        cone('roof', (x, 0, 5.7), .9, .05, 1.3, dark, 4, (0, 0, math.pi / 4))
        for z in (1.6, 2.8, 3.8):
            box('win', (x, -.76, z), (.2, .02, .5), mat('wn', hexc('1e2430'), .5), .005)
    box('walk', (0, 0, 4.2), (3.7, 1.0, .25), blue, .03)
    box('walk2', (0, 0, 3.95), (3.7, .9, .1), st, .02)
    box('road', (0, 0, 1.2), (8.2, 1.2, .3), blue, .04)
    for x in (-1.6, -.8, 0, .8, 1.6):
        box('susp', (x, 0, 2.7), (.05, .05, 2.6), gold, .005)
    box('ground', (0, 0, .5), (12, 3, .6), mat('wt', hexc('284a7a'), .15))
    stage((6, -8, 8), (-6, 5, 6)); cam((0, -17, 3.6), (0, 0, 2.9), 12.5); go('towerbridge')


def crown():
    reset((640, 560))
    gold, red, gem = mat('go', GOLD, .2, 1), mat('cap', hexc('7a0a24'), .55), mat('gem', hexc('0f52ba'), .05, 0, hexc('2a6fe0'), .6)
    cyl('band', (0, 0, .25), 1.2, .5, gold, (0, 0, 0), 48, .04)
    cyl('cap', (0, 0, .6), 1.12, .5, red, (0, 0, 0), 48, .04)
    for k in range(5):
        a = k * 2 * math.pi / 5
        cone('fl', (math.cos(a) * 1.05, math.sin(a) * 1.05, .75), .22, .05, .9, gold, 12)
        sph('pearl', (math.cos(a) * 1.05, math.sin(a) * 1.05, 1.25), .13, mat('pe', WHITE, .15))
    sph('g1', (0, -1.2, .27), .16, gem)
    sph('orb', (0, 0, 1.15), .3, gold)
    box('cr1', (0, 0, 1.55), (.1, .1, .5), gold, .02); box('cr2', (0, 0, 1.6), (.4, .1, .1), gold, .02)
    stage(); cam((0, -7, 2.4), (0, 0, .9), None, 55); go('crown')


MODELS = dict(bus=bus, phonebox=phonebox, bigben=bigben, guard=guard, towerbridge=towerbridge, crown=crown)
for n, f in MODELS.items():
    if not ONLY or n in ONLY: f()
