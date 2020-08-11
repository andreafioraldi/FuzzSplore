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
opt.add_argument("--corpus", help="Corpus directory", action='store', required=True)
opt.add_argument("--output", help="Corpus directory", action='store', required=True)
opt.add_argument('cmd', nargs=argparse.REMAINDER, help="Target program (and arguments)")

args = opt.parse_args()

AFL_SHOWMAP = os.path.join(script_dir, "../AFLplusplus/afl-showmap")
OUT_FILE = "virgin_map.bin"

testcases = {}
inputs_for_seconds = {}
coverage_over_time = {}
timeline = {}
graph = {}

bitmaps = []

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

my_map = [0] * (2 ** 16)

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

def merge_showmap():
    new_bits = 0
    interesting = False
    f = open(OUT_FILE, "rb")
    bytes_data = f.read()
    i = 0
    for b in bytes_data:
        if b != 0:
            if my_map[i] == 0:
                new_bits += 1
            if b > my_map[i]:
                interesting = True
                my_map[i] = b
        i += 1
    f.close()
    return bytes_data, new_bits, interesting

queue_dir = args.corpus
cmd = args.cmd

for f in sorted(iterate_files(queue_dir)):
    print(f)
    id, src, time = parse_filename(f)
    run_showmap(f, cmd)
    bitmap, new_bits, interesting = merge_showmap()
    if interesting:
        graph[id] = graph.get(id, [])
        timeline[time // 1000] = timeline.get(time // 1000, [])
        timeline[time // 1000] += [id]
        inputs_for_seconds[time // 1000] = inputs_for_seconds.get(time // 1000, 0)
        inputs_for_seconds[time // 1000] += 1
        if src is not None:
            for t in src:
                graph[t] = graph.get(t, [])
                graph[t] += [id]
    if new_bits:
        coverage_over_time[time // 1000] = coverage_over_time.get(time // 1000, 0)
        coverage_over_time[time // 1000] += new_bits
    bitmaps.append(list(bitmap))
    testcases[id] = {'time': time, 'interesting': interesting, 'new_bits': new_bits}

X = np.array(bitmaps)
del bitmaps

#pca = PCA(n_components=2)
#pca.fit(X)

print("TSNE...")
X_embedded = TSNE(n_components=2).fit_transform(X)

print("Saving to %s..." % args.output)
with open(args.output + '_data.json', 'w') as f:
    json.dump({
      'testcases': testcases,
      'inputs_for_seconds': inputs_for_seconds,
      'coverage_over_time': coverage_over_time,
      'timeline': timeline,
      'graph': graph,
    }, f)

np.savetxt(args.output + '_vectors.csv', X_embedded, delimiter=",")

print("Done.")
