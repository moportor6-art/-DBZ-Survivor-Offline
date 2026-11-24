# Cuadros elegidos de cada hoja (números de blobs.py). Animaciones: idle, walk, cast, punch, kohit, kolie, koup.
# 'dil': cuánto se juntan los trozos de una figura (1 en las hojas apretadas) · 'mirar': -1 si la hoja mira a la izquierda
# 'tono': recoloreado [(tono_desde, tono_hasta, giro, ×saturación, ×brillo)] (grados; solo los colores de ese rango)
SPECS = {
    # Dragon Ball GT: Transformation (GBA), ripeadas por Darkbolt99
    'gokugt': {'hoja': 'gt_goku_nino.png', 'idle': [0, 1, 2, 3], 'walk': [5, 6, 7, 8], 'cast': [113, 114],
               'punch': [29, 30, 31], 'kohit': [215], 'kolie': [206], 'koup': [213]},
    'gokugt-ssj': {'hoja': 'gt_goku_ssj4.png', 'idle': [0, 1, 2, 3], 'walk': [18, 19, 21, 22], 'cast': [114, 115],
                   'punch': [124, 125], 'kohit': [174], 'kolie': [178], 'koup': [180]},
    'vegetagt': {'hoja': 'gt_vegeta_ssj.png', 'idle': [0, 1, 2], 'walk': [9, 10, 12, 13], 'cast': [102, 103],
                 'punch': [44, 45], 'kohit': [172], 'kolie': [176], 'koup': [178]},
    'babyv': {'hoja': 'gt_baby_vegeta.png', 'idle': [0, 1, 2, 3], 'walk': [11, 12, 13, 15], 'cast': [82, 83]},
    # Rildo (GBA, ripeado por Nemu): mira a la izquierda
    'rildo': {'hoja': 'gt_rildo.png', 'mirar': -1, 'sombra': 1, 'idle': [0, 1, 2], 'walk': [0, 1, 2, 1], 'cast': [12, 13]},
    # Super 17 (Vairen Morningstar)
    'super17': {'hoja': 'gt_super17_vairen.png', 'idle': [36, 37, 38], 'walk': [42, 43, 44, 43], 'cast': [83, 84]},
    # Syn Shenron y Omega Shenron (AlquimistaSK, estilo ULSW)
    'synshen': {'hoja': 'gt_syn_shenron_alquimistask.png', 'idle': [14, 15], 'walk': [16, 17], 'cast': [20, 21]},
    'omegashen': {'hoja': 'gt_omega_shenron_ulsw.png', 'idle': [14, 15, 16], 'walk': [17, 18], 'cast': [25, 26]},
    # Nova, Eis y Haze ("Mr. Satan") y los tres que no tienen hoja, recoloreados
    'novashen': {'hoja': 'gt_dragones_mrsatan.png', 'dil': 1, 'idle': [10, 11], 'walk': [12, 13], 'cast': [19, 20]},
    'eisshen': {'hoja': 'gt_dragones_mrsatan.png', 'dil': 1, 'idle': [84, 85], 'walk': [86, 87], 'cast': [101, 102]},
    'hazeshen': {'hoja': 'gt_dragones_mrsatan.png', 'dil': 1, 'idle': [197, 198], 'walk': [199, 200], 'cast': [207, 245]},
    'rageshen': {'hoja': 'gt_dragones_mrsatan.png', 'dil': 1, 'idle': [197, 198], 'walk': [199, 200], 'cast': [207, 245],
                 'tono': [(60, 170, -95, 1.15, 0.95)]},
    'oceanshen': {'hoja': 'gt_dragones_mrsatan.png', 'dil': 1, 'idle': [84, 85], 'walk': [86, 87], 'cast': [101, 102],
                  'tono': [(170, 260, -45, 1.25, 1.0)]},
    'naturshen': {'hoja': 'gt_dragones_mrsatan.png', 'dil': 1, 'idle': [10, 11], 'walk': [12, 13], 'cast': [19, 20],
                  'tono': [(15, 60, -8, 0.75, 0.7), (250, 320, -170, 0.9, 0.85)]},
    # Gogeta SSJ4 (YoshidaMitooBR, SWL+) y Gogeta Xeno SSJ4 (Black Vinas, ULSW)
    'gogetagt': {'hoja': 'gt_gogeta_ssj4_yoshidamitoobr.png', 'idle': [55, 56, 57, 58], 'walk': [208, 209], 'cast': [177, 178],
                 'punch': [115, 116, 119], 'kohit': [151], 'kolie': [160], 'koup': [152]},
    'gogetaxeno': {'hoja': 'gt_gogeta_xeno_ssj4_blackvinas.png', 'idle': [99, 100, 101, 102], 'walk': [90, 105], 'cast': [158, 161],
                   'punch': [111, 112, 113]},
    # Pan, Uub y Majuub (ULSW; Majuub de Mr.Drk)
    'pangt': {'hoja': 'gt_pan_ulsw.png', 'idle': [5, 6, 7], 'walk': [8, 9], 'cast': [42, 44], 'punch': [21, 22, 24],
              'kohit': [11], 'kolie': [13], 'koup': [12]},
    # (tol 4: el fondo es casi del color del pelo)
    'uubgt': {'hoja': 'gt_uub_ulsw.png', 'tol': 4, 'idle': [5, 6], 'walk': [5, 6], 'cast': [49, 50], 'punch': [16, 18, 19],
              'kohit': [41], 'kolie': [44], 'koup': [40]},
    'uubgt-ssj': {'hoja': 'gt_majuub_mrdrk.png', 'islas': True, 'idle': [25, 26], 'walk': [23, 24], 'cast': [82, 83], 'punch': [32, 34, 35],
                  'kohit': [54], 'kolie': [17], 'koup': [56]},
}
