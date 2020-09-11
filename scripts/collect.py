#!/usr/bin/python3

import subprocess
import argparse
import json
import sys
import os

import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

DESCR=''''''

script_dir = os.path.dirname(os.path.realpath(os.path.abspath(__file__)))

opt = argparse.ArgumentParser(description=DESCR, formatter_class=argparse.RawTextHelpFormatter)
opt.add_argument("--conf", help="Configuration json", action='store', required=True)
opt.add_argument("--output", help="Output prefix", action='store', required=True)

args = opt.parse_args()

AFL_SHOWMAP = os.path.join(script_dir, "../AFLplusplus/afl-showmap")
OUT_FILE = "virgin_map.bin"

'''
[
  {
    "name": "ngram3",
    "corpus": "libpng/out/queue",
    "cmd": ["libpng/harness-ngram3", "@@"]
  }
]
'''
conf = json.load(open(args.conf))
print(conf)

# id:000213,src:000003,time:9769,op:havoc,rep:16,+cov
def parse_filename(name):
    name = name.split("/")[-1]
    src = None
    time = None
    id = int(name[3: name.find(",")])
    i = name.find("src:")
    if i >= 0:
        src = name[i+4: name.find(",", i)]
        src = list(map(int, src.split("+")))
    i = name.find("time:")
    if i >= 0:
        time = int(name[i+5: name.find(",", i)])
    return id, src, time

def iterate_files(path):
    for subdir, dirs, files in os.walk(path):
        for file in files:
            yield os.path.join(subdir, file)
        break

def run_showmap(f, cmd):
    cmd = cmd[:]
    os.system("rm %s" % OUT_FILE)
    for i in range(len(cmd)):
        if cmd[i] == "@@":
            cmd[i] = f
    showmap_args = [AFL_SHOWMAP, "-b", "-o", OUT_FILE, "--"] + cmd
    subprocess.check_call(showmap_args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def merge_showmap(virgin_bits):
    new_bits = 0
    interesting = False
    f = open(OUT_FILE, "rb")
    bytes_data = f.read()
    i = 0
    for b in bytes_data:
        if b != 0:
            if virgin_bits[i] == 0:
                new_bits += 1
            if b > virgin_bits[i]:
                interesting = True
                virgin_bits[i] = b
        i += 1
    f.close()
    return bytes_data, new_bits, interesting


testcases = {}
graph = {}
timeline = {}
coverage_over_time = {}

#vects = open(args.output + '_vectors.csv', 'w')
#vects.write('NAME,ID,X,Y\n')

all_bitmaps = []
fuzzers_bitmaps = []
idx_to_id = {}
idx_to_time = {}

for fuzzer in conf:
    queue_dir = fuzzer["corpus"]
    cmd = fuzzer["cmd"]
    name = fuzzer['name']

    bitmaps = []
    #virgin_bits = [0] * (2 ** 16)
    cov_virgin_bits = [0] * (2 ** 16)

    i = 0
    idx_to_id[name] = {}
    idx_to_time[name] = {}
    for f in sorted(iterate_files(queue_dir)):
        #print(name, f)
        id, src, time = parse_filename(f)
        sec = time // 1000
        if sec > 100: continue
        
        idx_to_id[name][i] = id
        idx_to_time[name][i] = sec
        i += 1
        #run_showmap(f, cmd)
        #bitmap, new_bits, interesting = merge_showmap(virgin_bits)
        #if interesting:
        graph[name] = graph.get(name, {})
        graph[name][id] = graph[name].get(id, [])
        timeline[name] = timeline.get(name, {})
        timeline[name][sec] = timeline[name].get(sec, [])
        timeline[name][sec] += [id]
        if src is not None:
            for srcid in src:
                graph[name] = graph.get(name, {})
                graph[name][srcid] = graph[name].get(srcid, [])
                graph[name][srcid] += [id]
                graph[name][srcid] = list(set(graph[name][srcid]))
                break
        #cov_new_bits = new_bits
        #if conf[0]['name'] != name:
        print(conf[0]['name'], f)
        run_showmap(f, conf[0]['cmd'])
        bitmap, cov_new_bits, _ = merge_showmap(cov_virgin_bits)
        if cov_new_bits:
            coverage_over_time[sec] = coverage_over_time.get(sec, {})
            coverage_over_time[sec][name] = coverage_over_time[sec].get(name, 0)
            coverage_over_time[sec][name] += cov_new_bits
        bitmaps.append(list(bitmap))
        testcases[name] = testcases.get(name, {})
        testcases[name][id] = testcases[name].get(id, {})
        testcases[name][id]['time'] = sec
        #testcases[name][id]['interesting'] = interesting
        #testcases[name][id]['new_bits'] = new_bits
        testcases[name][id]['cross'] = testcases[name][id].get('cross', [])

    for fuzzer2 in conf:
        if name == fuzzer2['name']: continue
        
        #queue_dir = fuzzer2["corpus"]
        virgin_bits = [0] * (2 ** 16)

        for f in sorted(iterate_files(queue_dir)):
            print(name, f)
            id, src, time = parse_filename(f)
            if sec > 100: continue

            run_showmap(f, cmd)
            _, new_bits, interesting = merge_showmap(virgin_bits)
            if interesting and id in testcases[name]:
                testcases[name][id]['cross'] = testcases[name][id].get('cross', [])
                testcases[name][id]['cross'].append(fuzzer2['name'])

    plen = len(all_bitmaps)
    all_bitmaps += bitmaps
    fuzzers_bitmaps.append((name, plen, len(all_bitmaps)))

    #X = np.array(bitmaps)

    #pca = PCA(n_components=2)
    #pca.fit(X)

    #print("TSNE...")
    #X_embedded = tsne.fit_transform(X)
    #np.savetxt(args.output + '_' + name + '_vectors.csv', X_embedded, delimiter=",", header='X,Y', comments='')

    #for i in range(len(bitmaps)):
    #    vects.write('%s,%d,%f,%f\n' % (name, idx_to_id[name][i], X_embedded[i][0], X_embedded[i][1]))

#print("Saving to %s_vectors.csv..." % args.output)
#vects.close()

X = np.array(all_bitmaps)
X_len = len(all_bitmaps)
del all_bitmaps
print("TSNE...")
X_embedded = TSNE(n_components=2).fit_transform(X)

print("Saving to %s_vectors.csv..." % args.output)
vects = open(args.output + '_vectors.csv', 'w')
vects.write('NAME,ID,TIME,X,Y\n')
for i in range(X_len):
    for name, start, end in fuzzers_bitmaps:
        if i in range(start, end):
            vects.write('%s,%d,%d,%f,%f\n' % (name, idx_to_id[name][i - start], idx_to_time[name][i - start], X_embedded[i][0], X_embedded[i][1]))
            break
vects.close()

print("Saving to %s_coverage.csv..." % args.output)
prev_cov = {}
covf = open(args.output + '_coverage.csv', 'w')
covf.write('NAME,TIME,VAL\n')
for sec in sorted(coverage_over_time.keys()):
    for name in coverage_over_time[sec]:
        prev_cov[name] = prev_cov.get(name, 0)
        prev_cov[name] += coverage_over_time[sec][name]
        covf.write('%s,%d,%d\n' % (name, sec, prev_cov[name]))
covf.close()

print("Saving to %s_inputs.csv..." % args.output)
inpf = open(args.output + '_inputs.csv', 'w')
inpf.write('NAME,TIME,VAL\n')
'''for sec in sorted(inputs_for_seconds.keys()):
    for name in inputs_for_seconds[sec]:
        inpf.write('%s,%d,%d\n' % (name, sec, inputs_for_seconds[sec][name]))'''
for name in timeline:
    for sec in timeline[name]:
        inpf.write('%s,%d,%s\n' % (name, sec, len(timeline[name][sec])))
inpf.close()

print("Saving to %s_timeline.csv..." % args.output)
timef = open(args.output + '_timeline.csv', 'w')
timef.write('NAME,TIME,IDS\n')
for name in timeline:
    for sec in timeline[name]:
        timef.write('%s,%d,%s\n' % (name, sec, ':'.join(map(str, timeline[name][sec]))))
timef.close()

def visit(fuzz, id):
    return {
      "name": id,
      "children": [visit(fuzz, child) for child in graph[fuzz][id]],
      "fuzzer": fuzz,
      **testcases[fuzz][id]
    }
d3graph = {}
for name in graph:
    d3graph[name] = visit(name, 0)

print("Saving to %s_graphs..." % args.output)
with open(args.output + '_graphs.json', 'w') as f:
    json.dump(d3graph, f)

'''
print("Saving to %s..." % args.output)
with open(args.output + '_data.json', 'w') as f:
    json.dump({
      'testcases': testcases,
      'inputs_for_seconds': inputs_for_seconds,
      'coverage_over_time': coverage_over_time,
      'timeline': timeline,
      'graph': graph,
    }, f)
'''

print("Done.")
