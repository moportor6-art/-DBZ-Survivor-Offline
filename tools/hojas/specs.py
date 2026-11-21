import json
spo = json.load(open('spo.json'))['boxes']; ya = json.load(open('yamu.json'))
S = lambda B, *ids: [B[i] for i in ids]
def a13(*ids): return [[(i % 10) * 64, 32 + (i // 10) * 64, (i % 10) * 64 + 64, 32 + (i // 10) * 64 + 64] for i in ids]
def npc(x0, row, *cols): return [[x0 + c * 16, 32 + row * 32, x0 + c * 16 + 16, 64 + row * 32] for c in cols]
NPCBG = [[42, 150, 108], [52, 188, 136], [71, 255, 187]]
def npcspec(src, x0, walk=(2, 3, 4, 5), cast=(1, 0), upwalk=None, idle=0):
    return {'src': src, 'bg': NPCBG, 'tol': 10, 'frames': {
        'side': {'idle': npc(x0, 2, idle), 'walk': npc(x0, 2, *walk), 'cast': npc(x0, 2, *cast)},
        'down': {'idle': npc(x0, 0, idle), 'walk': npc(x0, 0, *walk), 'cast': npc(x0, 0, *cast)},
        'up': {'idle': npc(x0, 3, idle), 'walk': npc(x0, 3, *(upwalk or walk)), 'cast': npc(x0, 3, idle, idle)}}}
specs = {
  'spopovich': {'src': 'spopovich.gif', 'bg': [[42, 97, 254], [41, 99, 255]], 'tol': 20, 'flipSide': True, 'frames': {
     'side': {'idle': S(spo, 16), 'walk': S(spo, 18, 19, 21, 20), 'cast': S(spo, 22, 25)},
     'down': {'idle': S(spo, 0), 'walk': S(spo, 2, 3, 4, 5), 'cast': S(spo, 13, 6)},
     'up': {'idle': S(spo, 32), 'walk': S(spo, 33, 29, 34, 35), 'cast': S(spo, 36, 37)},
     'ko': S(spo, 42, 51, 43)}},
  'yamu': {'src': 'yamu.png', 'bg': [[0, 128, 255]], 'tol': 20, 'flipSide': True, 'frames': {
     'side': {'idle': S(ya, 2), 'walk': S(ya, 13, 14, 15, 16), 'cast': S(ya, 47, 48)},
     'down': {'idle': S(ya, 0), 'walk': S(ya, 9, 10, 11, 12), 'cast': S(ya, 5, 0)},
     'up': {'idle': S(ya, 4), 'walk': S(ya, 17, 18, 19, 20), 'cast': S(ya, 7, 4)},
     'ko': S(ya, 33, 49, 44)}},
  'a13': {'src': 'a13.png', 'bg': [[21, 242, 242], [21, 186, 186]], 'tol': 12, 'flipSide': True, 'shadow': True, 'frames': {
     'side': {'idle': a13(13), 'walk': a13(12, 13, 64, 13), 'cast': a13(53, 63)},
     'down': {'idle': a13(0), 'walk': a13(3, 4, 5, 6), 'cast': a13(46, 47)},
     'up': {'idle': a13(8), 'walk': a13(7, 8, 10, 11), 'cast': a13(48, 60)}}},
  'bulma': npcspec('bulma.png', 0, cast=(6, 7)),
  'dende': npcspec('kami.png', 0),
  'popo': npcspec('kami.png', 160),
}
json.dump(specs, open('specs.json', 'w'))
