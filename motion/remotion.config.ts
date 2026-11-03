import { Config } from '@remotion/cli/config'

Config.setEntryPoint('src/index.ts')
// Fotogramas intermedios en PNG: el rojo sobre negro solo se comprime una vez, en el vídeo final
Config.setVideoImageFormat('png')
// El códec y la calidad van en los scripts: el vídeo sale en h264 y la mezcla aparte en WAV, para que el máster
// (tools/master.py) no recodifique un audio ya comprimido
Config.setOverwriteOutput(true)
