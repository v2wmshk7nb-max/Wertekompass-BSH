const crops={
 lettuce:{pot:[147,132,250,306],seed:[147,132,250,138],plant:[40,586,465,349]},
 basil:{pot:[630,90,265,348],seed:[630,90,265,181],plant:[542,560,440,387]},
 marigold:{pot:[1134,60,299,378],seed:[1134,60,299,213],plant:[1040,548,472,405]}
};

// Follow the bottom of the leaves and exclude the nursery pot.
const seedEdge={
 lettuce:'M147 132H397V225H330L299 234L284 267H268L255 245L223 225H147Z',
 basil:'M630 90H895V228H819L779 242L775 270H761L756 240L720 226H630Z',
 marigold:'M1134 60H1433V228H1344L1312 242L1281 270H1267L1260 241L1223 230L1160 249H1134Z'
};

export function gardenPlant(type,stage,height){
 const [x,y,w,h]=crops[type][stage];
 const width=height*w/h;
 const clip=stage==='seed'?`<defs><clipPath id="garden-seed-edge"><path d="${seedEdge[type]}"/></clipPath></defs>`:null;
 return `<svg x="${-width/2}" y="${-height}" width="${width}" height="${height}" viewBox="${x} ${y} ${w} ${h}" overflow="hidden">${clip||''}<image ${clip?'clip-path="url(#garden-seed-edge)"':''} href="assets/garden-bsh/pflanzen.png" width="1536" height="1024"/></svg>`;
}
