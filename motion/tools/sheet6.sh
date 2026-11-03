#!/usr/bin/env bash
# Hoja de contactos de un tramo: tools/sheet6.sh <desde> <hasta> <cada> <salida.png> [draft]
set -e
A=$1; B=$2; N=$3; OUT=$4; PROPS=${5:-'{"draft":true}'}
DIR=out/v6/seq_$RANDOM; mkdir -p $DIR
npx remotion render MeshMind "$DIR" --sequence --frames=$A-$B --image-format=jpeg --jpeg-quality=80 --props="$PROPS" --log=error >/dev/null
ls "$DIR" | sort | awk -v n=$N 'NR%n==1' > "$DIR/list.txt"
i=0; for f in $(cat "$DIR/list.txt"); do cp "$DIR/$f" "$DIR/pick_$(printf %03d $i).jpeg"; i=$((i+1)); done
COLS=4; ROWS=$(( (i + COLS - 1) / COLS ))
ffmpeg -v error -y -i "$DIR/pick_%03d.jpeg" -vf "scale=640:-1,drawtext=text='%{n}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.5,tile=${COLS}x${ROWS}" -frames:v 1 "$OUT"
cat "$DIR/list.txt" | tr '\n' ' '; echo
rm -rf "$DIR"
