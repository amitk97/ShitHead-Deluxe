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


def reset(res=(768, 768), samples=40, lk=0.5, skyk=0.12):
    LK[0] = lk
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
    nt = w.node_tree; bg = nt.nodes['Background']
    sky = nt.nodes.new('ShaderNodeTexSky'); sky.sky_type = 'MULTIPLE_SCATTERING'; sky.sun_elevation = math.radians(38); sky.sun_rotation = math.radians(215); sky.sun_disc = False
    nt.links.new(sky.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = skyk
    bpy.context.scene.view_settings.view_transform = 'Standard'
    return sc


def ground(size=40, z=0.0):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, z))
    g = bpy.context.object; g.is_shadow_catcher = True; return g


def rbox(name, loc, size, m, r=0.1, seg=6, rot=(0, 0, 0)):
    return box(name, loc, size, m, r, rot) if False else _rb(name, loc, size, m, r, seg, rot)


def _rb(name, loc, size, m, r, seg, rot):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    b = o.modifiers.new('b', 'BEVEL'); b.width = r; b.segments = seg; b.limit_method = 'NONE'
    bpy.ops.object.shade_smooth()
    return o


def text(s_, loc, size, m, rot=(math.pi / 2, 0, 0)):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    t = bpy.context.object; t.data.body = s_; t.data.size = size; t.data.align_x = 'CENTER'; t.data.align_y = 'CENTER'
    t.data.extrude = size * 0.03; t.data.materials.append(m); return t


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


LK = [0.5]


def light(kind, loc, energy, color=(1, 1, 1), size=3):
    bpy.ops.object.light_add(type=kind, location=loc)
    l = bpy.context.object; l.data.energy = energy * LK[0]; l.data.color = color
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


def bus(mode='all', angle=0.0):
    reset((1000, 1100), 64, 1.0, 0.22)
    WHEEL = []
    red, cream, black = mat('red', hexc('a30a1f'), .32), mat('cream', hexc('efe6cf'), .35), mat('blk', hexc('16161b'), .5)
    glass = mat('glass', hexc('0e1622'), .06, 0)
    chrome, tyre = mat('chrome', hexc('d6d9de'), .12, 1), mat('tyre', hexc('0d0d10'), .85)
    lamp = mat('lamp', hexc('fff3c4'), .1, 0, hexc('ffe9a0'), 4)
    blind = mat('blind', hexc('fff6dd'), .4, 0, hexc('fff0c0'), 1.6)
    ground(60)
    L = 8.4
    rbox('skirt', (0, 0, .62), (L, 2.46, .34), black, .08)                  # chassis skirt
    rbox('lower', (0, 0, 1.38), (L, 2.5, 1.5), red, .28, 10)                # lower deck
    rbox('upper', (-.12, 0, 3.2), (L - .26, 2.5, 2.05), red, .34, 10)       # upper deck, rounded roof
    rbox('band', (0, 0, 2.2), (L + .02, 2.54, .16), cream, .05)             # cream band between decks
    rbox('rail', (-.12, 0, 4.02), (L - .3, 2.53, .07), cream, .03)          # roof rain rail
    rbox('rail2', (-.12, 0, 2.43), (L - .3, 2.53, .07), cream, .03)
    # windows
    for i in range(7):
        x = -3.4 + i * 1.1
        rbox('uwin', (x, 1.26, 3.28), (.86, .06, .78), glass, .13)
        rbox('uwin', (x, -1.26, 3.28), (.86, .06, .78), glass, .13)
    for i in range(5):
        x = -2.9 + i * 1.12
        rbox('lwin', (x, 1.27, 1.5), (.86, .06, .66), glass, .12)
        rbox('lwin', (x, -1.27, 1.5), (.86, .06, .66), glass, .12)
    rbox('frontdoor', (3.15, 1.27, 1.35), (.7, .06, 1.15), glass, .09); rbox('frontdoor', (3.15, -1.27, 1.35), (.7, .06, 1.15), glass, .09)
    rbox('ad', (-.2, 1.27, .98), (4.4, .05, .34), mat('ad', hexc('e9b92b'), .35), .04)
    rbox('ad', (-.2, -1.27, .98), (4.4, .05, .34), mat('ad2', hexc('e9b92b'), .35), .04)
    # front: windscreen, blind box, lamps, grille, bumper
    rbox('screen', (3.97, 0, 3.22), (.06, 2.0, .86), glass, .12)
    rbox('screen2', (4.1, 0, 1.78), (.06, 2.0, .62), glass, .1)
    rbox('blindbox', (3.99, 0, 4.2), (.1, 1.5, .34), cream, .05)
    rbox('blind', (4.05, 0, 4.2), (.02, 1.36, .24), blind, .02)
    text('LONDON', (4.07, 0, 4.2), .17, black, (math.pi / 2, 0, math.pi / 2))
    for y in (-.78, .78):
        sph('lamp', (4.18, y, 1.22), .17, lamp, (.55, 1, 1)); 
        cyl('lampring', (4.17, y, 1.22), .2, .06, chrome, (0, math.pi / 2, 0), 32, .01)
    rbox('grille', (4.19, 0, 1.0), (.06, .9, .6), black, .06)
    cyl('badge', (4.24, 0, 1.0), .16, .03, red, (0, math.pi / 2, 0), 32, .005)
    rbox('bumper', (4.2, 0, .55), (.2, 2.4, .2), chrome, .07)
    rbox('bumperR', (-4.2, 0, .55), (.2, 2.4, .2), chrome, .07)
    # rear platform: open entrance with pole
    rbox('rearhole', (-4.18, 0, 1.4), (.08, 1.3, 1.25), black, .05)
    cyl('pole', (-4.2, .25, 1.4), .035, 1.5, chrome, (0, 0, 0), 12, .005)
    rbox('rearwin', (-4.1, 0, 3.2), (.06, 1.9, .8), glass, .12)
    for y in (-.8, .8): sph('taillight', (-4.2, y, .95), .13, mat('tl', hexc('ff2a2a'), .2, 0, hexc('ff2020'), 3), (.5, 1, 1))
    # wheels with arches: tyre with 8 tread blocks, hub and 8 bolts, all 8-fold symmetric so 8 frames over 45 degrees loop
    for x in (2.85, -2.35):
        for y in (-1, 1):
            cyl('arch', (x, y * 1.2, .66), .72, .1, black, (math.pi / 2, 0, 0), 40, .01)
            WHEEL.append(cyl('tyre', (x, y * 1.12, .55), .55, .34, tyre, (math.pi / 2, 0, 0), 40, .08))
            WHEEL.append(cyl('hub', (x, y * 1.3, .55), .3, .06, chrome, (math.pi / 2, 0, 0), 32, .01))
            for k in range(8):
                a = angle + k * math.pi / 4
                WHEEL.append(sph('bolt', (x + math.sin(a) * .2, y * 1.34, .55 + math.cos(a) * .2), .03, black))
                WHEEL.append(rbox('tread', (x + math.sin(a) * .55, y * 1.12, .55 + math.cos(a) * .55), (.1, .36, .1), black, .02, 2, (0, a, 0)))
    # roundel on the lower side
    for y in (-1.285, 1.285):
        t = bpy.ops.mesh.primitive_torus_add(major_radius=.2, minor_radius=.04, location=(1.9, y, 1.55), rotation=(math.pi / 2, 0, 0))
        bpy.context.object.data.materials.append(mat('rr', hexc('e32219'), .3))
        rbox('rbar', (1.9, y * 1.002, 1.55), (.5, .03, .09), mat('rb', hexc('1a3f9c'), .3), .02)
    light('AREA', (9, -9, 9), 700, (1.0, .93, .82), 6)
    light('AREA', (-7, 6, 6), 260, (.7, .8, 1.0), 6)
    if mode == 'wheels':
        hold = bpy.data.materials.new('hold'); hold.use_nodes = True
        nt = hold.node_tree; nt.nodes.clear(); out = nt.nodes.new('ShaderNodeOutputMaterial'); h = nt.nodes.new('ShaderNodeHoldout'); nt.links.new(h.outputs[0], out.inputs[0])
        for o in bpy.context.scene.objects:
            if o.type in ('MESH', 'CURVE', 'FONT') and o not in WHEEL:
                o.data.materials.clear(); o.data.materials.append(hold)
        for o in list(bpy.context.scene.objects):
            if o.type == 'MESH' and o.is_shadow_catcher: o.hide_render = True
    cam((11.2, -5.2, 2.1), (0, 0, 2.15), None, 50)
    go('bus_body' if mode == 'all' else 'bus_wheels_%02d' % round(angle / (math.pi / 32)))


def phonebox():
    reset((700, 1000), 64)
    red, glass, gold, black = mat('r', hexc('b30c20'), .26), mat('g', hexc('9fc0d4'), .03), mat('gold', GOLD, .3, 1), mat('k', hexc('1a1a1f'), .5)
    cream = mat('cm', hexc('fff0c8'), .3, 0, hexc('ffe6a0'), 1.4)
    ground(30)
    rbox('plinth', (0, 0, .12), (1.3, 1.3, .24), red, .05, 4)
    for x, y in ((.55, .55), (-.55, .55), (.55, -.55), (-.55, -.55)):
        rbox('post', (x, y, 1.5), (.14, .14, 2.5), red, .04, 4)
    for z in (.35, 2.55):
        for sgn in (1, -1):
            rbox('beam', (0, .55 * sgn, z), (1.2, .12, .12), red, .03, 3)
            rbox('beam', (.55 * sgn, 0, z), (.12, 1.2, .12), red, .03, 3)
    # glazing bars: 8 panes high-ish grid on all four sides (door faces front -y)
    for sgn in (1, -1):
        for side in 'xy':
            for i in range(-1, 2):
                for z in (.95, 1.45, 1.95):
                    pass
            for cx in (-.22, .22):
                for z in (.85, 1.35, 1.85):
                    if side == 'x':
                        rbox('pane', (cx, .56 * sgn, z), (.38, .03, .42), glass, .02, 3)
                    else:
                        rbox('pane', (.56 * sgn, cx, z), (.03, .38, .42), glass, .02, 3)
            for z in (1.1, 1.6, 2.1):
                if side == 'x': rbox('bar', (0, .56 * sgn, z), (1.05, .06, .05), red, .01, 2)
                else: rbox('bar', (.56 * sgn, 0, z), (.06, 1.05, .05), red, .01, 2)
            if side == 'x': rbox('bar', (0, .56 * sgn, 1.4), (.06, .06, 2.0), red, .01, 2)
            else: rbox('bar', (.56 * sgn, 0, 1.4), (.06, .06, 2.0), red, .01, 2)
    rbox('cornice', (0, 0, 2.78), (1.4, 1.4, .22), red, .07, 4)
    for sgn in (1, -1):
        rbox('sign', (0, .68 * sgn, 2.72), (1.0, .02, .24), cream, .02, 2)
        rbox('sign', (.68 * sgn, 0, 2.72), (.02, 1.0, .24), cream, .02, 2)
    # domed roof: stacked flattened spheres
    sph('dome', (0, 0, 2.9), .78, red, (1, 1, .45))
    rbox('cap', (0, 0, 3.2), (.5, .5, .1), red, .04, 3)
    for sgn in (1, -1):
        cyl('crown', (0, .7 * sgn, 2.9), .09, .02, gold, (math.pi / 2, 0, 0), 24, .005)
        cyl('crown', (.7 * sgn, 0, 2.9), .09, .02, gold, (0, math.pi / 2, 0), 24, .005)
    text('TELEPHONE', (0, -.695, 2.72), .13, black)
    text('TELEPHONE', (.695, 0, 2.72), .13, black, (math.pi / 2, 0, math.pi / 2))
    rbox('handle', (.18, -.6, 1.4), (.04, .05, .5), gold, .015, 3)
    light('AREA', (5, -6, 8), 650, (1.0, .93, .82), 5); light('AREA', (-6, 4, 5), 220, (.7, .8, 1), 5)
    cam((4.4, -5.6, 3.1), (0, 0, 1.55), None, 52); go('phonebox')


def bigben():
    reset((560, 1100), 64)
    st, gold, dark, face, black = mat('st', hexc('a8905c'), .6), mat('gold', GOLD, .25, 1), mat('roof', hexc('2e4f4a'), .35, .2), mat('face', hexc('fff4d6'), .45, 0, hexc('ffe9a8'), 1.0), mat('k', hexc('15161b'), .5)
    ground(30)
    rbox('base', (0, 0, 1.4), (2.3, 2.3, 2.8), st, .04, 3)
    rbox('shaft', (0, 0, 5.0), (1.9, 1.9, 4.4), st, .03, 3)
    for x, y in ((.95, .95), (-.95, .95), (.95, -.95), (-.95, -.95)):
        rbox('rib', (x, y, 5.0), (.26, .26, 4.5), st, .06, 3)
    for z0 in (3.6, 4.7, 5.8):
        for (x, y, sx, sy) in ((0, -.96, .26, .03), (.96, 0, .03, .26), (0, .96, .26, .03), (-.96, 0, .03, .26)):
            rbox('win', (x, y, z0), (sx, sy, .72), black, .01, 2)
    rbox('belt', (0, 0, 7.4), (2.3, 2.3, .22), st, .04, 3)
    rbox('clock', (0, 0, 8.7), (2.5, 2.5, 2.4), st, .04, 3)
    for rot, (cx, cy) in (((math.pi / 2, 0, 0), (0, -1.27)), ((math.pi / 2, 0, math.pi / 2), (1.27, 0)), ((math.pi / 2, 0, math.pi), (0, 1.27)), ((math.pi / 2, 0, -math.pi / 2), (-1.27, 0))):
        cyl('face', (cx * .96, cy * .96, 8.7), .98, .08, face, rot, 56, .01)
        cyl('ring', (cx, cy, 8.7), 1.08, .06, gold, rot, 56, .01)
        nx, ny = (0, -1) if cy < 0 else ((0, 1) if cy > 0 else ((1, 0) if cx > 0 else (-1, 0)))
        tx, ty = -ny, nx
        for k in range(12):
            a = k * math.pi / 6; r = .84
            px, pz = math.sin(a) * r, math.cos(a) * r
            rbox('tick', (cx + tx * px, cy + ty * px, 8.7 + pz), (.07 if abs(ty) < .5 else .035, .07 if abs(tx) < .5 else .035, .15), black, .005, 2)
        rbox('hh', (cx * 1.02 + tx * .0, cy * 1.02, 8.7 + .26), (.07 if abs(ty) < .5 else .03, .07 if abs(tx) < .5 else .03, .55), black, .01, 2)
        rbox('mh', (cx * 1.03 + tx * .22, cy * 1.03 + ty * .22, 8.7 + .06), (.05 if abs(ty) < .5 else .03, .05 if abs(tx) < .5 else .03, .78), black, .01, 2)
    rbox('belfry', (0, 0, 10.5), (2.2, 2.2, 1.1), st, .04, 3)
    for z in (10.5,):
        for (x, y, sx, sy) in ((0, -1.12, .5, .03), (1.12, 0, .03, .5), (0, 1.12, .5, .03), (-1.12, 0, .03, .5)):
            rbox('louver', (x, y, z), (sx, sy, .8), black, .01, 2)
    cone('spire', (0, 0, 12.4), 1.5, .05, 2.9, dark, 4, (0, 0, math.pi / 4))
    cone('tip', (0, 0, 14.1), .08, .005, .9, gold, 10)
    for x, y in ((.95, .95), (-.95, .95), (.95, -.95), (-.95, -.95)):
        cone('pin', (x, y, 11.4), .2, .01, 1.0, gold, 8)
    light('AREA', (6, -8, 12), 900, (1.0, .93, .82), 6); light('AREA', (-7, 5, 9), 320, (.7, .8, 1), 6)
    cam((3.2, -30, 7.4), (0, 0, 7.2), 17.4); go('bigben')


def guard():
    reset((768, 768), 64)
    red, black, skin, gold, wht, fur, navy = mat('tun', hexc('b10f1f'), .45), mat('blk', hexc('141418'), .55), mat('skin', hexc('e7b090'), .5), mat('gold', GOLD, .28, 1), mat('wh', hexc('f1eee6'), .5), mat('fur', hexc('17171c'), .95), mat('nv', hexc('1c2a4a'), .55)
    ground(20, -1.2)
    sph('torso', (0, 0, .35), 1.0, red, (1.18, .8, 1.0))                       # chest
    sph('shL', (-1.05, 0, .62), .5, red); sph('shR', (1.05, 0, .62), .5, red)  # shoulders
    for x in (-1, 1):
        rbox('epau', (x * 1.0, 0, .98), (.6, .5, .1), gold, .04, 3)
        sph('fringe', (x * 1.0, -.1, .88), .1, gold, (2.4, 1, .5))
    rbox('belt', (0, -.01, -.42), (2.1, 1.45, .2), wht, .06, 4)
    rbox('buckle', (0, -.76, -.42), (.3, .06, .24), gold, .02, 3)
    for z in (.7, .35, .0):
        sph('btn', (-.22, -.82, z), .075, gold); sph('btn', (.22, -.82, z), .075, gold)
    rbox('sash', (0, -.7, .35), (.18, .08, 1.5), wht, .03, 3)
    cyl('neck', (0, 0, 1.0), .32, .35, skin, (0, 0, 0), 24, .02)
    rbox('collar', (0, -.05, 1.0), (.8, .6, .22), red, .09, 4)
    sph('head', (0, -.02, 1.68), .6, skin, (.92, .88, 1.0))
    for x in (-.2, .2):
        sph('eyew', (x, -.5, 1.78), .09, wht, (1, .5, 1.2)); sph('pupil', (x, -.56, 1.78), .05, black)
        rbox('brow', (x, -.54, 1.93), (.2, .05, .04), mat('br', hexc('3a2a1e'), .7), .01, 2)
    sph('nose', (0, -.58, 1.62), .08, skin, (1, 1.2, 1))
    rbox('moustache', (0, -.57, 1.5), (.34, .06, .07), mat('br2', hexc('3a2a1e'), .7), .03, 3)
    sph('lip', (0, -.55, 1.42), .06, mat('lp', hexc('b05a55'), .6), (2, .6, .7))
    for x in (-1, 1): sph('ear', (x * .55, -.02, 1.68), .12, skin, (.5, 1, 1.2))
    cyl('strap', (0, -.02, 1.38), .5, .06, gold, (0, 0, 0), 32, .01)           # chin strap
    sph('bear', (0, .12, 2.78), .78, fur, (1.0, .92, 1.18))                     # bearskin
    for k in range(18):
        a = k * math.pi * 2 / 18
        sph('tuft', (math.cos(a) * .7, math.sin(a) * .66 + .12, 2.55 + (k % 3) * .25), .15, fur)
    cyl('band', (0, .0, 2.16), .64, .09, black, (0, 0, 0), 32, .01)
    rbox('plume', (.55, .0, 3.25), (.1, .1, .6), red, .04, 3); sph('plumetip', (.55, .0, 3.6), .1, red)
    # Arms: the left one hangs at his side; the right forearm comes forward to grip a rifle held at attention beside him.
    def limb(p0, p1, r, m):
        v = Vector(p1) - Vector(p0)
        bpy.ops.mesh.primitive_cylinder_add(location=(Vector(p0) + Vector(p1)) / 2, radius=r, depth=v.length, vertices=24)
        o = bpy.context.object; o.rotation_euler = v.to_track_quat('Z', 'Y').to_euler(); o.data.materials.append(m)
        bpy.ops.object.shade_smooth(); return o
    limb((-1.05, 0, .6), (-1.22, -.12, -.7), .26, red); sph('gloveL', (-1.24, -.14, -.85), .22, wht)
    limb((1.05, 0, .6), (1.18, -.5, .05), .25, red); sph('elbowR', (1.18, -.5, .05), .25, red)
    sph('gloveR', (1.2, -.62, -.12), .22, wht)
    cyl('rifle', (1.2, -.62, .4), .06, 3.4, black, (0, 0, 0), 16, .01)
    cyl('bayo', (1.2, -.62, 2.25), .03, .55, mat('st', hexc('c8ccd4'), .2, 1), (0, 0, 0), 12, .005)
    rbox('rifleStock', (1.2, -.62, -.85), (.14, .1, .9), mat('wd', hexc('5a3a22'), .6), .03, 3)
    light('AREA', (4, -6, 6), 650, (1.0, .93, .82), 5); light('AREA', (-5, 3, 4), 260, (.7, .8, 1), 5)
    cam((0, -8.2, 1.9), (0, 0, 1.55), None, 62); go('guard')


def _tower(x, st, dark, gold, black):
    rbox('t', (x, 0, 2.3), (1.7, 1.7, 4.6), st, .04, 3)
    rbox('t2', (x, 0, 5.1), (1.45, 1.45, 1.1), st, .04, 3)
    for dx, dy in ((.68, .68), (-.68, .68), (.68, -.68), (-.68, -.68)):
        cone('tur', (x + dx, dy, 6.0), .26, .02, 1.3, dark, 10)
        rbox('tw', (x + dx, dy, 5.4), (.22, .22, .7), st, .05, 3)
    cone('roof', (x, 0, 6.2), 1.1, .05, 1.6, dark, 4, (0, 0, math.pi / 4))
    cone('fin', (x, 0, 7.15), .07, .005, .5, gold, 8)
    for z in (1.2, 2.3, 3.4):
        for yy in (-.86, .86):
            rbox('win', (x, yy, z), (.22, .03, .55), black, .01, 2)
    rbox('arch', (x, -.86, 1.0), (.5, .03, .8), black, .1, 4)


def _tb_setup(res=(1400, 700)):
    reset(res, 56)
    st, dark, gold, blue, black = mat('st', hexc('7a8496'), .6), mat('roof', hexc('2e4f4a'), .35, .2), mat('go', GOLD, .3, 1), mat('bl', hexc('2f67b8'), .35, .5), mat('k', hexc('1a1d25'), .5)
    return st, dark, gold, blue, black


def towerbridge(part='full'):
    st, dark, gold, blue, black = _tb_setup()
    if part in ('full', 'base'):
        ground(60, 0)
        for x in (-2.8, 2.8): _tower(x, st, dark, gold, black)
        rbox('walkway', (0, 0, 5.3), (4.4, 1.3, .3), blue, .05, 3)         # upper walkway
        rbox('walkway2', (0, 0, 5.0), (4.2, 1.1, .18), st, .03, 3)
        for sgn in (-1, 1):                                                  # suspension side spans
            for k in range(7):
                x = sgn * (4.0 + k * .6); h = 1.6 - (k * .07)
                rbox('hang', (x, 0, 2.6 + (6 - k) * .02), (.05, .05, 2.4 - k * .05), gold, .005, 2)
            rbox('sideroad', (sgn * 5.6, 0, 1.15), (3.9, 1.2, .26), blue, .04, 3)
            rbox('sidepier', (sgn * 7.2, 0, .55), (.6, 1.0, 1.1), st, .04, 3)
            ang = math.atan2(4.9 - 1.3, 3.9)
            cyl('chain', (sgn * 5.55, 0, 3.1), .04, math.hypot(3.9, 3.6), gold, (0, -sgn * (math.pi / 2 - ang), 0), 8, .005)
    if part in ('full', 'leafL', 'leafR'):
        for sgn in ((-1,) if part == 'leafL' else (1,) if part == 'leafR' else (-1, 1)):
            rbox('leaf', (sgn * 1.15, 0, 1.15), (2.2, 1.2, .26), blue, .04, 3)
            for k in range(5): rbox('rail', (sgn * (.2 + k * .5), .6, 1.4), (.04, .04, .3), gold, .005, 2)
    light('AREA', (6, -10, 11), 1100, (1.0, .93, .82), 7); light('AREA', (-8, 6, 8), 400, (.7, .8, 1), 7)
    cam((0, -24, 4.4), (0, 0, 3.7), 17); go('tb_' + part if part != 'full' else 'towerbridge')


def londoneye():
    reset((1000, 1100), 56)
    wh, blue, black = mat('wh', hexc('f1f4f8'), .3, .4), mat('cap', hexc('9cc6ee'), .08, .2), mat('k', hexc('20242c'), .5)
    ground(40, 0)
    cx, cz, R = 0, 4.2, 3.7
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=.09, location=(cx, 0, cz), rotation=(math.pi / 2, 0, 0)); bpy.context.object.data.materials.append(wh)
    bpy.ops.mesh.primitive_torus_add(major_radius=R - .35, minor_radius=.05, location=(cx, 0, cz), rotation=(math.pi / 2, 0, 0)); bpy.context.object.data.materials.append(wh)
    for k in range(16):
        a = k * math.pi / 8
        cyl('spoke', (math.sin(a) * (R - .17) / 2, 0, cz + math.cos(a) * (R - .17) / 2), .018, R - .17, wh, (0, a, 0), 8, .002)
        cyl('spoke', (math.sin(a) * (R - .17) / 2, .12, cz + math.cos(a) * (R - .17) / 2), .018, R - .17, wh, (0, a, 0), 8, .002)
        sph('capsule', (math.sin(a) * (R + .22), 0, cz + math.cos(a) * (R + .22) - .22), .24, blue, (1, 1.5, 1))
    cyl('hub', (0, 0, cz), .22, .5, wh, (math.pi / 2, 0, 0), 24, .02)
    for sgn in (-1, 1):
        cyl('leg', (sgn * .6, .2, 1.95), .1, 4.3, wh, (0, sgn * -.28, 0), 12, .01)
        cyl('leg', (sgn * .6, -.2, 1.95), .1, 4.3, wh, (0, sgn * -.28, 0), 12, .01)
    light('AREA', (6, -9, 10), 900, (1.0, .93, .82), 6); light('AREA', (-8, 5, 8), 320, (.7, .8, 1), 6)
    cam((0, -26, 4.2), (0, 0, 4.2), 10.4); go('londoneye')


MODELS = dict(bus=bus, bus_wheels=lambda: [bus('wheels', k * math.pi / 32) for k in range(8)], phonebox=phonebox, bigben=bigben, guard=guard, londoneye=londoneye,
              towerbridge=towerbridge, tb_base=lambda: towerbridge('base'), tb_leafL=lambda: towerbridge('leafL'), tb_leafR=lambda: towerbridge('leafR'))
for n, f in MODELS.items():
    if not ONLY or n in ONLY: f()
