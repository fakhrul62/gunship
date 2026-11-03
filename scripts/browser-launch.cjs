module.exports={headless:true,
 ...(process.env.BROWSER==='edge'?{channel:'msedge'}:{}),
 ...(process.env.HARDWARE==='1'&&process.platform==='win32'
  ?{ignoreDefaultArgs:['--use-angle=swiftshader-webgl'],args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']}
  :{args:['--enable-unsafe-swiftshader']})};
