let c = document.getElementById('canvas')
let optionList = document.getElementById('ukuran_bahan').options

// reset value
const resetForm = () => {
    document.getElementById('numOfPage').innerText = 1
    document.getElementById('ukuran_bahan').value = ''
    document.getElementById('lebar_design').value = ''
    document.getElementById('tinggi_design').value = ''
    document.getElementById('margin').value = ''
    document.getElementById('amountOfDesign').value = ''
    document.getElementById('optimize-minimize-area').checked = true
    document.getElementById('optimize-fill-area').checked = true
    document.getElementById('design-dalam-lembar').value = ''
    document.getElementById('jumlah-kertas-dibutuhkan').value = ''
    document.getElementById('luas-kertas-terbuang').value = ''
    document.getElementById('satuan_lebar_kertas').value = 'cm'
    document.getElementById('satuan_tinggi_kertas').value = 'cm'
    document.getElementById('satuan_lebar').value = 'cm'
    document.getElementById('satuan_tinggi').value = 'cm'
    document.getElementById('satuan_jarak').value = 'cm'
}

resetForm()

// define preprocessor
const FAILURE = false

// Global variabel Paper, Sticker, Margin dan Waste
let Paper = {
    width: 0,
    height: 0
}

let Sticker = {
    width: 0,
    height: 0,
    amountWidth: 0, // amount of sticker horizontally
    amountHeight: 0 // amount of sticker vertically
}

let Page = 1;

let Margin = 0
let Waste = 0
let AmountOfDesign = 0
let BackupAmountOfDesign = 0
let BackupStickersOnPaper = 0

let AmountStickersOnPaper = 0
let AmountPapers = 0
let AdditionalPaper = 0
let AdditionalDesign = 0 // additional sticker

let Optimization = {
    minimize_wasted_area: false, // rotate sticker while draw (if possible)
    fill_wasted_area: false, // add rotate sticker after drawn sticker (if possible)
    can_minimize: false, // if total of count optimize is bigger than total of count default
    can_fill: false, // if wasted paper can be fill using rotate sticker
    orientation: '', // horizontal or vertical
    last_position_x: 0,
    last_position_y: 0,
}

let KoordinatBawah = 0
let KoordinatSamping = 0

const options = [
    {
        value: '',
        text: 'Pilih Ukuran Bahan'
    },
    {
        value: '47x31',
        text: 'Max Area Cetak A3+ Tanpa Jarak (47x31cm)'
    },
    {
        value: '47x31m0.4',
        text: 'Potong Mesin Potong (47x31cm)'
    },
    {
        value: '42.5x28.5m0',
        text: 'Graphtec Persegi Kiss cut (42.5x28.5cm)'
    },
    {
        value: '42.5x28.5m0.2',
        text: 'Graphtec Pola Kiss cut (42.5x28.5cm)'
    },
    {
        value: '42.5x28.5m0.4',
        text: 'Graphtec Die cut (42.5x28.5cm)'
    },
    {
        value: '30x43m0.2',
        text: 'Barcode Kiss cut (30x43cm)'
    },
    {
        value: '30x43.5m0.4',
        text: 'Vulcan Die cut (30x43.5cm)'
    },
    {
        value: '90x90m0.4',
        text: 'Meteran Kiss cut (90x90cm)'
    },
    {
        value: 'Others',
        text: 'Custom Size'
    }
]

options.forEach(option =>
    optionList.add(
        new Option(option.text, option.value)
    )
)

const calculateDesign = () => {
    let countWidth = 0
    let countHeight = 0

    let totalWidth = 0
    let totalHeight = 0

    let optSelection = false

    while(totalWidth < Paper.width) {
        totalWidth += (Sticker.width + Margin)
        countWidth++

        // keep width value to be not offset
        if(totalWidth > Paper.width) {
            totalWidth -= (Sticker.width + Margin)
            countWidth--
            break
        }
    }

    while(totalHeight < Paper.height) {
        totalHeight += Sticker.height + Margin
        countHeight++

        // keep height value to be not offset
        if(totalHeight > Paper.height) {
            totalHeight -= Sticker.height + Margin
            countHeight--
            break
        }
    }

    KoordinatSamping = totalWidth
    KoordinatBawah = totalHeight

    let optCountWidth = 0
    let optCountHeight = 0

    let optTotalWidth = 0
    let optTotalHeight = 0

    if(Optimization.minimize_wasted_area) {

        while(optTotalWidth < Paper.width) {
            optTotalWidth += (Sticker.height + Margin)
            optCountWidth++

            // keep width value to be not offset
            if(optTotalWidth > Paper.width) {
                optTotalWidth -= (Sticker.height + Margin)
                optCountWidth--
                break
            }
        }

        while(optTotalHeight < Paper.height) {
            optTotalHeight += Sticker.width + Margin
            optCountHeight++

            // keep height value to be not offset
            if(optTotalHeight > Paper.height) {
                optTotalHeight -= Sticker.width + Margin
                optCountHeight--
                break
            }
        }

        const totalCount = countWidth * countHeight
        const totalOptCount = optCountWidth * optCountHeight

        if(totalCount < totalOptCount) {
            countWidth = optCountWidth
            countHeight = optCountHeight

            Optimization.can_minimize = true

            KoordinatSamping = optTotalWidth
            KoordinatBawah = optTotalHeight
        }

        if(Optimization.can_minimize)
            optSelection = true
    }

    // optimization fill wasted active
    if(Optimization.fill_wasted_area) {
        let gapWidth = 0
        let gapHeight = 0

        // get gap from width and height paper by total of sum
        if(optSelection) {
            gapWidth = Paper.width - optTotalWidth
            gapHeight = Paper.height - optTotalHeight

            console.log('bermasalah jalan')
        } else {
            gapWidth = Paper.width - totalWidth
            gapHeight = Paper.height - totalHeight

            console.log('optSelection', optSelection)
        }

        // check if gap can be add
        if((gapWidth - (Sticker.height + Margin)) > 0) {
            Optimization.orientation = 'vertically'
            Optimization.can_fill = true
        }

        if((gapHeight - (Sticker.width + Margin)) > 0) {
            Optimization.orientation = 'horizontally'
            Optimization.can_fill = true
        }
    }

    Sticker.amountWidth = countWidth
    Sticker.amountHeight = countHeight

    // console.log('Stiker', Sticker)
}

const initPaper = (kertas) => {
    // lebar dan tinggi kertas dari satuan (cm)
    const browserWidth = document.getElementById('app')

    // parse to be px
    const widthPixel = browserWidth.clientWidth
    const heightPixel = (kertas.tinggi / kertas.lebar) * widthPixel

    c.width = widthPixel
    c.height = heightPixel
    c.style = "border: 1px solid lightgray"

    Paper.width = widthPixel
    Paper.height = heightPixel

    // console.log('Paper', Paper)
}

const initSticker = (stiker, kertas) => {
    // lebar dan tinggi stiker dari satuan (cm)

    // parse to be px
    const widthPixel = (stiker.lebar / kertas.lebar) * Paper.width
    const heightPixel = (stiker.tinggi / kertas.tinggi) * Paper.height

    Sticker.width = widthPixel
    Sticker.height = heightPixel

    // menghitung jumlah stiker yang tersedia
    calculateDesign()
}

const initMargin = (margin, kertas) => {
    // use width of paper
    // lu can change width as height

    Margin = (margin / kertas.lebar) * Paper.width

    // console.log('Margin', Margin);
}

const drawSticker = () => {
    let ctx = c.getContext('2d')
    let leb = document.getElementById('lebar_design').value
    let ting = document.getElementById('tinggi_design').value
    let countDesign = 0

    console.log('Optimization', Optimization)
    console.log('can minimize', Optimization.can_minimize)

    if(Optimization.can_minimize) {
        // will be optimized
        for(let row = 0; row < Sticker.amountHeight; row++) {
            let tempPositionX = 0
            let tempPositionY = 0
            for(let column = 0; column < Sticker.amountWidth; column++) {
                // check pada column apakah sudah sesuai dengan jumlah keinginan customer
                if(countDesign >= AmountOfDesign && AmountOfDesign != '') break

                const marginColumn = (Margin * (column + 1))
                const marginRow = (Margin * (row + 1))

                const positionColumn = (Sticker.height * column) + marginColumn
                const positionRow = (Sticker.width * row) + marginRow

                tempPositionX = positionColumn + Sticker.height
                tempPositionY = positionRow + Sticker.width

                // menggambar persegi :D
                let text1 = leb + ' x ' + ting
                let a1 = countDesign+1
                let cont1 = '#' + a1
                ctx.beginPath()
                ctx.rect(positionColumn, positionRow, Sticker.height, Sticker.width)
                ctx.fillText(text1,positionColumn + 10,positionRow + 30)
                ctx.fillText(cont1,positionColumn + 10,positionRow + 20)
                ctx.stroke()

                countDesign++
            }

            // optimisasi fill area
            if(Optimization.can_fill) {
                if(Optimization.orientation == 'horizontally') {
                    Optimization.last_position_x = tempPositionX
                    // Optimization.last_position_y = tempPositionY
                } else {
                    // Optimization.last_position_x = tempPositionX
                    Optimization.last_position_y = tempPositionY
                }
            }

            // check pada row apakah sudah sesuai dengan jumlah keinginan customer
            if(countDesign >= AmountOfDesign && AmountOfDesign != '') break
        }

    } else {
        // will be not optimized
        for(let row = 0; row < Sticker.amountHeight; row++) {
            let tempPositionX = 0
            let tempPositionY = 0
            for(let column = 0; column < Sticker.amountWidth; column++) {
                // check pada column apakah sudah sesuai dengan jumlah keinginan customer
                if(countDesign >= AmountOfDesign && AmountOfDesign != '') break

                const marginColumn = (Margin * (column + 1))
                const marginRow = (Margin * (row + 1))

                const positionColumn = (Sticker.width * column) + marginColumn
                const positionRow = (Sticker.height * row) + marginRow

                tempPositionX = positionColumn + Sticker.width
                tempPositionY = positionRow + Sticker.height

                // menggambar persegi :D


                let text2 = leb + ' x ' + ting
                let a2 = countDesign+1
                let cont2 = '#' + a2
                ctx.beginPath()
                ctx.rect(positionColumn, positionRow, Sticker.width, Sticker.height)
                ctx.fillText(text2,positionColumn + 10,positionRow + 30)
                ctx.fillText(cont2,positionColumn + 10,positionRow + 20)
                ctx.stroke()

                countDesign++
            }

            // optimisasi fill area
            if(Optimization.can_fill) {
                if(Optimization.orientation == 'horizontally') {
                    Optimization.last_position_y = tempPositionY
                    // Optimization.last_position_x = tempPositionX
                } else {
                    Optimization.last_position_x = tempPositionX
                    // Optimization.last_position_y = tempPositionY
                }
            }

            // check pada row apakah sudah sesuai dengan jumlah keinginan customer
            if(countDesign >= AmountOfDesign && AmountOfDesign != '') break
        }
    }

    needAdditionalProcess = false

    if(!(countDesign >= AmountOfDesign && AmountOfDesign != ''))
        needAdditionalProcess = true

    if(Optimization.can_fill && needAdditionalProcess) {

        // console.log('Masalah', Optimization.can_fill)
        // console.log('Masalah', needAdditionalProcess)

        if(Optimization.orientation == 'horizontally' && (KoordinatBawah + Sticker.width) < Paper.height) {

            let newAmountWidth = 0
            let newTotalWidth = 0

            let newTempHeightPaper = 0
            let newTotalStickerRow = 0

            while(newTempHeightPaper < (Paper.Height - (KoordinatBawah + Margin))) {
                newTempHeightPaper += (Sticker.width + Margin)
                newTotalStickerRow++

                if(newTempHeightPaper > (Paper.height - (KoordinatBawah + Margin))) {
                    newTempHeightPaper--
                    newTotalStickerRow--
                }
            }

            while(newTotalWidth < Paper.width) {
                newTotalWidth += (Sticker.height + Margin)
                newAmountWidth++

                if(newTotalWidth > Paper.width) {
                    newTotalWidth -= (Sticker.height + Margin)
                    newAmountWidth--
                    break
                }
            }

            let tempPositionX = 0
            let tempPositionY = 0

            AdditionalDesign = newAmountWidth

            let pc = 0
            let pr = 0

            while(newTotalStickerRow) {
                for(let row = Sticker.amountHeight; row < Sticker.amountHeight + 1; row++) {
                    for(let column = 0; column < newAmountWidth; column++) {
                        // check pada column apakah sudah sesuai dengan jumlah keinginan customer
                        if(countDesign >= AmountOfDesign && AmountOfDesign != '') break

                        const marginColumn = (Margin * (column + 1))
                        const marginRow = (Margin)

                        tempPositionY = (tempPositionY) ? tempPositionY : Optimization.last_position_y

                        const positionColumn = (Sticker.height * column) + marginColumn
                        const positionRow = tempPositionY + marginRow
                        // const positionRow = Optimization.last_position_y + marginRow

                        pc = positionColumn
                        pr = positionRow

                        // latest custom
                        // const positionColumn = Optimization.last_position_x + marginColumn
                        // const positionRow = (Sticker.width * row) + marginRow

                        // menggambar persegi :D
                        let text3 = leb + ' x ' + ting
                        let a3 = countDesign+1
                        let cont3 = '#' + a3
                        ctx.beginPath()
                        ctx.rect(positionColumn, positionRow, Sticker.height, Sticker.width)
                        ctx.fillText(text3,positionColumn + 10,positionRow + 30)
                        ctx.fillText(cont3,positionColumn + 10,positionRow + 20)
                        ctx.stroke()

                        countDesign++
                    }

                    // check pada row apakah sudah sesuai dengan jumlah keinginan customer
                    if(countDesign >= AmountOfDesign && AmountOfDesign != '') break
                }

                tempPositionX = pc + Sticker.height
                tempPositionY = pr + Sticker.width

                newTotalStickerRow--

            }

        } else if((KoordinatSamping + Sticker.height) < Paper.width) {

            let newAmountHeight = 0
            let newTotalHeight = 0

            let newTempWidthPaper = 0
            let newTotalStickerCol = 0

            while(newTempWidthPaper < (Paper.width - (KoordinatSamping + Margin))) {
                newTempWidthPaper += (Sticker.height + Margin)
                newTotalStickerCol++

                if(newTempWidthPaper > (Paper.width - (KoordinatSamping + Margin))) {
                    newTempWidthPaper--
                    newTotalStickerCol--
                }
            }

            while(newTotalHeight < Paper.height) {
                newTotalHeight += (Sticker.width + Margin)
                newAmountHeight++

                if(newTotalHeight > Paper.height) {
                    newTotalHeight -= (Sticker.width + Margin)
                    newAmountHeight--
                    break
                }
            }

            // console.log(newAmountHeight)
            // console.log(newTotalHeight)

            console.log('tambahan', newTotalStickerCol)

            let tempPositionX = 0
            let tempPositionY = 0

            AdditionalDesign = newAmountHeight

            let pc = 0 // position column
            let pr = 0 // position row

            while(newTotalStickerCol) {

                for(let row = 0; row < newAmountHeight; row++) {
                    for(let column = Sticker.amountWidth; column < Sticker.amountWidth + 1; column++) {
                        // check pada column apakah sudah sesuai dengan jumlah keinginan customer
                        if(countDesign >= AmountOfDesign && AmountOfDesign != '') break

                        const marginColumn = (Margin)
                        const marginRow = (Margin * (row + 1))

                        tempPositionX = (tempPositionX) ? tempPositionX : Optimization.last_position_x

                        // const positionColumn = Optimization.last_position_x + marginColumn
                        const positionColumn = tempPositionX + marginColumn
                        const positionRow = (Sticker.width * row) + marginRow

                        pc = positionColumn
                        pr = positionRow

                        // latest custom
                        // const positionColumn = (Sticker.height * column) + marginColumn
                        // const positionRow = Optimization.last_position_y + marginRow

                        // menggambar persegi :D
                        let text4 = leb + ' x ' + ting
                        let a4 = countDesign+1
                        let cont4 = '#' + a4
                        ctx.beginPath()
                        ctx.rect(positionColumn, positionRow, Sticker.height, Sticker.width)
                        ctx.fillText(text4,positionColumn + 10,positionRow + 30)
                        ctx.fillText(cont4,positionColumn + 10,positionRow + 20)
                        ctx.stroke()

                        countDesign++
                    }

                    // check pada row apakah sudah sesuai dengan jumlah keinginan customer
                    if(countDesign >= AmountOfDesign && AmountOfDesign != '') break
                }

                tempPositionX = pc + Sticker.height
                tempPositionY = pr + Sticker.width

                newTotalStickerCol--
            }
        } else {
            console.error('something error')
        }
    }

    AmountStickersOnPaper = countDesign

    if(BackupStickersOnPaper == 0) {
        BackupStickersOnPaper = AmountStickersOnPaper
    }
}

let KertasInRAW = {
    lebar: 0,
    tinggi: 0
}

let StickerInRAW = {
    lebar: 0,
    tinggi: 0
}

const calculateWaste = (kertas, stiker) => {
    // total stiker pada sebuah kertas
    let totalSticker = (Sticker.amountHeight * Sticker.amountWidth) + AdditionalDesign

    if(AmountOfDesign != '') {
        totalSticker = parseFloat(AmountStickersOnPaper) + parseFloat(AdditionalDesign)
    }

    // luas kertas
    const areaPaper = kertas.lebar * kertas.tinggi
    // luas stiker
    const areaSticker = stiker.lebar * stiker.tinggi * totalSticker

    // selisih kertas antara luas kertas dengan banyaknya luas stiker
    const gapArea = areaPaper - areaSticker
    const wastePaper = (gapArea / areaPaper) * 100

    Waste = wastePaper.toFixed(2)

    console.log(`Waste: ${ Waste }%`)
}

let CurrentPage = 1

const changePage = (location) => {
    let numOfPages = Math.ceil(parseFloat(BackupAmountOfDesign / BackupStickersOnPaper))
    let ctx = c.getContext('2d')

    ctx.clearRect(0, 0, Paper.width, Paper.height)

    console.log('AmountOfDesign', AmountOfDesign)
    console.log('BackupStickersOnPaper', BackupStickersOnPaper)
    console.log('numOfPages', numOfPages)

    if(location == 'next' && CurrentPage < numOfPages) {
        let amountOfNextPage = AmountOfDesign - (AmountStickersOnPaper * CurrentPage)

        console.log('amountOfNextPage', amountOfNextPage);

        if(amountOfNextPage > AmountStickersOnPaper) {
            amountOfNextPage = AmountStickersOnPaper
        } else {
            amountOfNextPage = BackupAmountOfDesign % AmountStickersOnPaper
        }

        console.log('amountOfNextPage', amountOfNextPage);

        AmountOfDesign = amountOfNextPage

        console.log('AmountOfDesign', AmountOfDesign)

        CurrentPage++
        Page++
    } else if(location == 'previous' && CurrentPage > 1) {
        AmountOfDesign = BackupAmountOfDesign

        console.log('AmountOfDesign', AmountOfDesign)
        CurrentPage--
        Page--
    } else {
        if(location == 'next') {
            Swal.fire('Peringatan', 'Sudah halaman terakhir', 'warning')
        } else if(location == 'previous') {
            Swal.fire('Peringatan', 'Sudah halaman pertama', 'warning')
        }

        console.error('Page sudah mentok')
    }

    drawSticker()
    document.getElementById('design-dalam-lembar').value = AmountStickersOnPaper
    document.getElementById('numOfPage').innerHTML = Page

    calculateWaste(KertasInRAW, StickerInRAW)
    document.getElementById('luas-kertas-terbuang').value = Waste
}

const paperCheck = (kertas) => {
    let customForm = document.getElementById('custom-bahan')
    let margin = document.getElementById('margin')

    if(kertas.value == '') { // default value for paper size
        margin.value = ''
        margin.removeAttribute('readonly')
    } else if(kertas.value == 'Others') { // other value can custom paper size
        customForm.removeAttribute('style')

        margin.value = ''
        margin.removeAttribute('readonly')
    } else if(kertas.value.includes('m')) { // paper size value include default margin
        const tempMargin = kertas.value.split('m')
        const valueMargin = tempMargin[1]

        if(!customForm.hasAttribute('style'))
            customForm.setAttribute('style', 'display:none')

        margin.value = valueMargin
        margin.setAttribute('readonly', true)
    } else { // paper with default size exclude margin
        if(!customForm.hasAttribute('style'))
            customForm.setAttribute('style', 'display:none')

        // make margin form can be insert
        if(margin.hasAttribute('readonly')) {
            margin.value = ''
            margin.removeAttribute('readonly')
        }
    }

    calculate()
}

const updateDistance = (satuan) => {
    document.getElementById('satuan_lebar_kertas').value = satuan.value
    document.getElementById('satuan_tinggi_kertas').value = satuan.value
    document.getElementById('satuan_lebar').value = satuan.value
    document.getElementById('satuan_tinggi').value = satuan.value
    document.getElementById('satuan_jarak').value = satuan.value

    let margin = document.getElementById('margin')

    let customPaperWidth = document.getElementById('custom-width')
    let customPaperHeight = document.getElementById('custom-height')

    let stickerWidth = document.getElementById('lebar_design')
    let stickerHeight = document.getElementById('tinggi_design')

    try {
        (customPaperWidth.value) ? customPaperWidth.value : 0
        (customPaperHeight.value) ? customPaperHeight.value : 0
    } catch(e) {
        console.error(e)
    }

    (stickerWidth.value) ? stickerWidth.value : 0
    (stickerHeight.value) ? stickerHeight.value : 0

    if(satuan.value == 'mm') {
        margin.value = parseFloat(margin.value) * 10

        customPaperWidth.value = parseFloat(customPaperWidth.value) * 10
        customPaperHeight.value = parseFloat(customPaperHeight.value) * 10

        stickerWidth.value = parseFloat(stickerWidth.value) * 10
        stickerHeight.value = parseFloat(stickerHeight.value) * 10
    } else if(satuan.value == 'cm') {
        margin.value = parseFloat(margin.value) / 10

        customPaperWidth.value = parseFloat(customPaperWidth.value) / 10
        customPaperHeight.value = parseFloat(customPaperHeight.value) / 10

        stickerWidth.value = parseFloat(stickerWidth.value) / 10
        stickerHeight.value = parseFloat(stickerHeight.value) / 10
    }

    calculate()
}

const calculate = () => {
    // reset optimization
    Optimization.can_minimize = false
    Optimization.can_fill = false

    AdditionalDesign = 0
    AdditionalPaper = 0

    Page = 1
    CurrentPage = 1

    Optimization.orientation = ''

    // ukuran kertas (lebar x tinggi) dalam cm
    const paperSize = document.getElementById('ukuran_bahan').value

    // desain (lebar x tinggi) dalam cm
    const lebarDesign = document.getElementById('lebar_design').value
    const tinggiDesign = document.getElementById('tinggi_design').value

    // margin (left, top) dalam cm
    const marginAll = document.getElementById('margin').value

    // keinginan customer dalam menentukan jumlah
    const amountRequestDesign = document.getElementById('amountOfDesign').value

    // belum tau mau diapakan
    const satuanLebarKertas = document.getElementById('satuan_lebar_kertas')
    const satuanTinggiKertas = document.getElementById('satuan_tinggi_kertas')
    const satuanLebar = document.getElementById('satuan_lebar')
    const satuanTinggi = document.getElementById('satuan_tinggi')
    const satuanJarak = document.getElementById('satuan_jarak')

    const isMilimeter = (satuanLebar.value == 'mm') ? 10 : 1

    Optimization.minimize_wasted_area = (document.getElementById('optimize-minimize-area').checked == true)

    Optimization.fill_wasted_area = (document.getElementById('optimize-fill-area').checked == true)

    let lebarKertas = 0
    let tinggiKertas = 0

    // algoritma buat cek paper size
    if(paperSize == 'Others') {
        const customWidth = document.getElementById('custom-width').value
        const customHeight = document.getElementById('custom-height').value

        if(customWidth == '' || customHeight == '') {
            document.getElementById('error-message').innerHTML = `Form ukuran bahan dan jarak wajib di isi`

            console.error('Ops.. proses gue hentikan')
            return FAILURE
        }

        lebarKertas = parseFloat(customWidth) / isMilimeter
        tinggiKertas = parseFloat(customHeight) / isMilimeter
    } else {
        const tempPaperSize = paperSize.split('x')

        lebarKertas = parseFloat(tempPaperSize[0])
        tinggiKertas = parseFloat(tempPaperSize[1])
    }

    // algoritma untuk mencegah dunia hancur
    if(lebarDesign == '' || tinggiDesign == '' || marginAll == '' || paperSize == '') {
        document.getElementById('error-message').innerHTML = `<div class="alert alert-danger" role="alert">Form ukuran bahan dan jarak wajib di isi</div>`
        console.error('Ops.. proses gue hentikan')
        return FAILURE
    }

    // kertas, stiker dan margin
    const kertas = {
        lebar: lebarKertas,
        tinggi: tinggiKertas
    }

    const stiker = {
        lebar: parseFloat(lebarDesign) / isMilimeter,
        tinggi: parseFloat(tinggiDesign) / isMilimeter
    }

    const margin = parseFloat(marginAll) / isMilimeter

    // ireference from Global Variabel
    AmountOfDesign = amountRequestDesign

    // backup untuk change page
    BackupAmountOfDesign = AmountOfDesign
    KertasInRAW = kertas
    StickerInRAW = stiker

    // reset value
    // resetForm()

    document.getElementById('error-message').innerHTML = ``

    // inisialisasi nilai ke global variabel
    initPaper(kertas)
    initMargin(margin, kertas)
    initSticker(stiker, kertas)

    // menggambar stiker di atas kertas
    drawSticker()

    // menghitung kemubaziran pada design
    calculateWaste(kertas, stiker)

    let amountSticker = (Sticker.amountHeight * Sticker.amountWidth)

    if(Optimization.can_fill)
        amountSticker += AdditionalDesign

    document.getElementById('numOfPage').innerText = 1

    document.getElementById('design-dalam-lembar').value = AmountStickersOnPaper

    const jumlahKertas = Math.ceil(parseFloat(BackupAmountOfDesign / AmountStickersOnPaper))

    document.getElementById('jumlah-kertas-dibutuhkan').value = (jumlahKertas) ? jumlahKertas : 1

    document.getElementById('luas-kertas-terbuang').value = Waste

    // next and prev button (if AmountStickersOnPaper > AmountOfDesign)
    // AmountStickersOnPaper => desain sticker yang dicetak dalam sebuah kertas
    // AmountOfDesign => jumlah sticker yang diinginkan customer
}

window.addEventListener('resize', calculate);

// TODO:
// 1. Penerapan optimasi desain dalam kertas [done]
// 2. Menentukan keinginan user dalam menentukan jumlah desain yang ingin dibuat pada kertas
// 3. Menampilkan nilai jumlah lembar, jumlah desain dan waste pada interface [done]
// 4. Uji sisa kertas dengan sticker yang akan disisipkan [done]