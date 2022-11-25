const fs = require('fs');
const path = require('path');

const codes = [
  "45357068197315026889001",
  "46122646497438698039001",
  "46122646497438698029001",
  "46122892297438733349001",
  "46122892297438733339001",
  "46123853597438868219001",
  "46124278297438929679001",
  "46124278297438929689001",
  "46126522097439258809001",
  "46130975797439923359001",
  "46130975797439923369001",
  "46131321597439971339001",
  "46133918097440352129001",
  "46133918097440352109001",
  "46134560797440447299001",
  "46141513297441467669001",
  "46146050297442093069001",
  "46227711697454890149001",
  "46227711697454890159001",
  "46234300297455884579001",
  "46235692597456081999001",
  "46239437697456652199001",
  "46239744497456696779001",
  "46239744497456696769001",
  "46243285397457214029001",
  "46243285397457214019001",
  "46243851997457297139001",
  "46248240797457937439001",
  "46253187897458622249001",
  "46255231397458911489001",
  "46256541697459095609001",
  "46272270897461368089001",
  "46272270897461368069001",
  "46276031897461936129001",
  "46282729097462959919001",
  "46350046297473649719001",
  "46456974797490928199001",
  "46456974797490928209001",
  "46460904397491571259001",
  "46461762497491714579001",
  "46462988697491900219001",
  "46465126997492200579001",
  "46633594997520389089001",
  "46633594997520389079001",
  "46633804397520426219001",
  "46642104597522004359001",
  "46642104597522004349001",
  "46751669397539720389001",
  "46770111197542717999001",
  "46770111197542718019001",
  "46770111197542718029001",
  "46814790297550437269001",
  "46814790297550437309001",
  "46814790297550437299001",
  "46814790297550437279001",
  "46925435197568085379001",
  "46925435197568085389001",
  "47018661497583221439001",
  "47026008697584369469001",
  "47026173697584395489001",
  "47026564397584455119001",
  "47026564397584455109001",
  "47028618997584781019001",
  "47028618997584781029001",
  "47031600597585252629001",
  "47189566397611375499001",
  "47374463497644475369001",
  "47375581497644646909001",
  "47383899097645922349001",
  "47474394297660922819001",
  "47474394297660922829001",
  "47474394297660922809001",
  "47582739597678558819001",
  "47599297497681178919001",
  "47599297497681178899001",
  "47599297497681178909001",
  "47599297497681178889001",
  "47624395197685073539001",
  "47641824097687935669001",
  "47641824097687935649001",
  "47705329097698506129001",
  "47817319497716933929001",
  "47817484597716961419001",
  "47817791397717010329001",
  "47850983797722513749001",
  "47850983797722513759001",
  "47901559197731077629001",
  "48070405497761719749001",
  "48072614097762061959001",
  "48072672197762071699001",
  "48072672197762071689001",
  "48074504197762367159001",
  "48114264197769022709001",
  "48142754397773761649001",
  "48170380997778489569001",
  "48170900297778568679001",
  "48173640097779009219001",
  "48175424597779296059001",
  "48181490597780225369001",
  "48188716297781352299001",
  "48201591697783354029001",
  "48201591697783354009001",
  "48201591697783353989001",
  "48201591697783354049001",
  "48219066297786110129001",
  "48295696297798779429001",
  "48300984297799625759001",
  "48300984297799625789001",
  "48408955797817672379001",
  "48408955797817672389001",
  "48424245797820170559001",
  "48424983197820295429001",
  "48444629397823473499001",
  "48453695397824940319001",
  "48460194097825984549001",
  "48464557797826702319001",
  "48515297397835356559001",
  "48515894897835457009001",
  "48522061697836464789001",
  "48530718497837894089001",
  "48539719897839416949001",
  "48545441997840608889001",
  "48555296097842213899001",
  "48640020397857096989001",
  "48660029497860947079001",
  "48660029497860947069001",
  "48736952797875485679001",
  "48773103897881866269001",
  "48781287297883206579001",
  "48782718297883434149001",
  "48783363797883537299001",
  "48783536897883565239001",
  "48783584097883572629001",
  "48785507597883874819001",
  "48786398497884014819001",
  "48790159897884633429001",
  "48790234397884646049001",
  "48790685397884714639001",
  "48793183897885110799001",
  "48800194497886200449001",
  "48800544697886255609001",
  "48800978197886322599001",
  "48801852897886454319001",
  "48805713097887060809001",
  "48805863297887084369001",
  "48805863297887084359001",
  "48816008297888652329001",
  "48823121997889745399001",
  "48829494797890773369001",
  "48831942297891163699001",
  "48832704797891291569001",
  "48836775697891958809001",
  "48846329297893530329001",
  "48850199597894169939001",
  "48882490297899572439001",
  "48888266897900579819001",
  "48891511297901099199001",
  "48893267797901379019001",
  "48953494097911046089001",
  "49011995397920736489001",
  "49066766097929462429001",
  "49122276697938914709001",
  "49130358697940254839001",
  "49139019297941623009001",
  "49149481897943293989001",
  "49241773297958741279001",
  "49242007397958776049001",
  "49246015097959433479001",
  "49246242097959470269001",
  "49246728497959550299001",
  "49246856897959569799001",
  "49247237197959630019001",
  "49251387697960301749001",
  "49252269697960444659001",
  "49271849197963598949001",
  "49271849197963598989001",
  "49273546297963872699001",
  "49274085897963960469001",
  "49345603797976506539001",
  "49345750497976531809001",
  "49362478697979596599001",
  "49423305497990832569001",
  "49425056197991162889001",
  "49425684197991283109001",
  "49426131597991364749001",
  "49439566297993830599001",
  "49440397997993975939001",
  "49444128697994655979001",
  "49483089898001583689001",
  "49483864098001712399001",
  "49485131498001914299001",
  "49486150898002078019001",
  "49487034398002214129001",
  "49487359498002268049001",
  "49488581198002458209001",
  "49492126398003010589001",
  "49493382698003204299001",
  "49494369098003358149001",
  "49494369098003358159001",
  "49495251098003493709001",
  "49495359598003510749001",
  "49495359598003510739001",
  "49495359598003510729001",
  "49495359598003510719001",
  "49495472098003529309001",
  "49495647698003561249001",
  "49495891298003593929001",
  "49495968198003606329001",
  "49496252898003655929001",
  "49496736198003730779001",
  "49497609998003868539001",
  "49500266198004309219001",
  "49500511298004354299001",
  "49502198898004641109001",
  "49504481898005000429001",
  "49505043998005084739001",
  "49507622298005518749001",
  "49507622298005518759001",
  "49509561998005819509001",
  "49509561998005819499001",
  "49516658098006904379001",
  "49528816498008824439001",
  "49532042298009346899001",
  "49532064698009350329001",
  "49536398498010035679001",
  "49542587698011044789001",
  "49544534198011359599001",
  "49544534198011359589001",
  "49555521598013159969001",
  "49555521598013159959001",
  "49558535798013646409001",
  "49558535798013646419001",
  "49562483798014300669001",
  "49588248398018680249001",
  "49591699598019292689001",
  "49594293098019734599001",
  "49595501598019936779001",
  "49596274098020070179001",
];

async function main () {
  const array = codes.map(code => ({
    code,
    limit: 1,
  }));
  console.log(array)

  fs.writeFileSync('codes.json', JSON.stringify(array, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })