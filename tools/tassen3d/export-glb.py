import sys, os, math, bpy
HERE = os.path.dirname(os.path.abspath(__file__))
GLB_OUT = sys.argv[sys.argv.index('--')+1]
TEX = int(sys.argv[sys.argv.index('--')+2]) if len(sys.argv) > sys.argv.index('--')+2 else 2048
sys.argv = [sys.argv[0], '--', os.path.join(HERE,'unused.png'), '0', '64', '400']
exec(open(os.path.join(HERE,'klassik.py')).read())
from mathutils import Vector
sc = bpy.context.scene
root = bpy.data.objects['mug']; root.rotation_euler = (0,0,0)
bpy.context.view_layer.update()

def select_only(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

# Körper und Henkel zu einem Netz, Modifikatoren anwenden (Unterteilung 1 reicht, Three.js glättet die Normalen)
body = bpy.data.objects['body']; handle = bpy.data.objects['handle']
body.modifiers['sub'].levels = 1
select_only([handle]); bpy.ops.object.convert(target='MESH')
handle = bpy.context.object
select_only([body]); bpy.ops.object.convert(target='MESH')
body = bpy.context.object
kids = [o for o in sc.objects if o.parent == root]
select_only(kids); bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
import bmesh
# UVs selbst setzen: Körper als Rechteck (U = Winkel, V = Weg entlang des Profils, Außenwand bekommt mehr Platz),
# Henkel unten in einem schmalen Streifen. So ist der Aufdruck scharf und nichts überlappt.
for ob in (body, handle):
    select_only([ob]); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
HV = .1  # Anteil des Henkels unten
# dichtes Profil mit gewichteter Bogenlänge
dense = []
for (x0,z0),(x1,z1) in zip(prof, prof[1:]):
    for k in range(20): t=k/20; dense.append((x0+(x1-x0)*t, z0+(z1-z0)*t))
dense.append(prof[-1])
def weight(x,z,idx):
    # Außenwand (Index im Profil 6..11) bekommt dreifaches Gewicht
    return 3.0 if 6*20 <= idx <= 11*20 else .6
acc=[0.0]
for i in range(1,len(dense)):
    (x0,z0),(x1,z1)=dense[i-1],dense[i]; acc.append(acc[-1]+math.hypot(x1-x0,z1-z0)*weight(x0,z0,i))
TOT=acc[-1]
def vparam(r,z):
    best=min(range(len(dense)), key=lambda i:(dense[i][0]-r)**2+(dense[i][1]-z)**2)
    return HV + (1-HV)*(1-acc[best]/TOT)
me=body.data; bm=bmesh.new(); bm.from_mesh(me); uv=bm.loops.layers.uv.verify()
vcache={}
for f in bm.faces:
    us=[]
    for l in f.loops:
        co=l.vert.co
        if l.vert.index not in vcache: vcache[l.vert.index]=vparam(math.hypot(co.x,co.y), co.z)
        u=(math.atan2(co.y,co.x)/(2*math.pi))%1.0
        us.append(u)
    if max(us)-min(us)>.5: us=[u+1 if u<.5 else u for u in us]
    for l,u in zip(f.loops,us): l[uv].uv=(u*0.999, vcache[l.vert.index])
bm.to_mesh(me); bm.free()
while handle.data.uv_layers: handle.data.uv_layers.remove(handle.data.uv_layers[0])
while len(body.data.uv_layers) > 1: body.data.uv_layers.remove(body.data.uv_layers[1])
handle.data.uv_layers.new(name=body.data.uv_layers[0].name)
select_only([handle]); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.01); bpy.ops.object.mode_set(mode='OBJECT')
for l in handle.data.uv_layers.active.data: l.uv=(l.uv[0]*.999, l.uv[1]*(HV-.01))
select_only([body, handle]); bpy.ops.object.join(); body = bpy.context.object; body.name = 'body'
select_only([body]); bpy.ops.object.shade_smooth()
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
anise = [o for o in sc.objects if o.type=='MESH' and o.data.materials and o.data.materials[0].name.startswith('anise')]
select_only(anise); bpy.ops.object.join(); bpy.context.object.name = 'anise'
cin = [o for o in sc.objects if o.type=='MESH' and o.data.materials and o.data.materials[0].name.startswith('cinnamon')]
select_only(cin); bpy.ops.object.join(); bpy.context.object.name = 'cinnamon'
bpy.data.objects['Circle'].name = 'wine' if 'Circle' in bpy.data.objects else None
for o in sc.objects:
    if o.type=='MESH' and o.data.materials and o.data.materials[0].name.startswith('orange'): o.name = 'orange'

# Backen: Grundfarbe (mit Aufdruck, Goldrand, Fuß) und Rauheit/Metall als Emission, dazu Umgebungsverdeckung
mat = body.data.materials[0]; N = mat.node_tree.nodes; L = mat.node_tree.links
out = [n for n in N if n.type=='OUTPUT_MATERIAL'][0]
surface_from = out.inputs['Surface'].links[0].from_socket
def mixc(fac, a, b):
    m = N.new('ShaderNodeMix'); m.data_type = 'RGBA'
    L.new(fac, m.inputs['Factor']);
    if isinstance(a, tuple): m.inputs[6].default_value = a
    else: L.new(a, m.inputs[6])
    m.inputs[7].default_value = b
    return m.outputs[2]
printf, rim, foot = N['printf'].outputs[0], N['rim'].outputs[0], N['foot'].outputs[0]
# Fuß: foot=0 unten (Biskuit), 1 sonst -> invertieren
inv = N.new('ShaderNodeMath'); inv.operation='SUBTRACT'; inv.inputs[0].default_value=1; L.new(foot, inv.inputs[1])
GLAZE=(0.11,0.003,0.016,1); PRINT=(0.86,0.6,0.3,1); GOLD=(0.92,0.62,0.28,1); BISQ=(0.62,0.5,0.4,1)
col = mixc(inv.outputs[0], mixc(rim, mixc(printf, GLAZE, PRINT), GOLD), BISQ)
# ORM: G = Rauheit, B = Metall
rough = mixc(inv.outputs[0], mixc(rim, mixc(printf, (0,0.16,0,1), (0,0.32,0.45,1)), (0,0.17,1,1)), (0,0.85,0,1))
emit = N.new('ShaderNodeEmission')
img = lambda name: bpy.data.images.new(name, TEX*2, TEX, alpha=False, float_buffer=False)
tex = N.new('ShaderNodeTexImage'); N.active = tex
sc.cycles.samples = 16; sc.cycles.use_denoising = False
sc.render.bake.margin = 8
select_only([body])
def bake(name, socket, typ='EMIT', samples=16):
    im = img(name); tex.image = im; N.active = tex
    if socket is not None:
        L.new(socket, emit.inputs['Color']); L.new(emit.outputs[0], out.inputs['Surface'])
    else:
        L.new(surface_from, out.inputs['Surface'])
    sc.cycles.samples = samples
    bpy.ops.object.bake(type=typ)
    im.filepath_raw = os.path.join(HERE, name + '.png'); im.file_format = 'PNG'; im.save()
    return im
base = bake('mug_base', col)
orm = bake('mug_orm', rough)
bpy.data.worlds['w'].node_tree.nodes['Background'].inputs['Strength'].default_value = 1
ao = bake('mug_ao', None, 'AO', 64)
print('baked')

# Exportmaterial: Principled mit Texturen und Klarlack
from PIL import Image
o = Image.open(os.path.join(HERE,'mug_orm.png')).convert('RGB'); a = Image.open(os.path.join(HERE,'mug_ao.png')).convert('L')
r,g,b = o.split(); Image.merge('RGB',(a,g,b)).save(os.path.join(HERE,'mug_orm.png'))
em = bpy.data.materials.new('mug'); em.use_nodes = True; EN = em.node_tree.nodes; EL = em.node_tree.links
bs = EN['Principled BSDF']
tb = EN.new('ShaderNodeTexImage'); tb.image = bpy.data.images.load(os.path.join(HERE,'mug_base.png')); EL.new(tb.outputs['Color'], bs.inputs['Base Color'])
to = EN.new('ShaderNodeTexImage'); to.image = bpy.data.images.load(os.path.join(HERE,'mug_orm.png')); to.image.colorspace_settings.name='Non-Color'
sp = EN.new('ShaderNodeSeparateColor'); EL.new(to.outputs['Color'], sp.inputs[0]); EL.new(sp.outputs['Green'], bs.inputs['Roughness']); EL.new(sp.outputs['Blue'], bs.inputs['Metallic'])
bs.inputs['Coat Weight'].default_value = 1.0; bs.inputs['Coat Roughness'].default_value = 0.035
body.data.materials.clear(); body.data.materials.append(em)

# nur die Tasse exportieren
for ob in list(sc.objects):
    if ob.type != 'MESH' or ob.is_shadow_catcher: bpy.data.objects.remove(ob)
bpy.ops.export_scene.gltf(filepath=GLB_OUT, export_format='GLB', export_image_format='WEBP', export_apply=True, export_yup=True)
print('exported', os.path.getsize(GLB_OUT))
