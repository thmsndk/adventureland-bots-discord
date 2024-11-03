import { GData, TitleName } from "alclient"

// https://stackoverflow.com/a/40724354/28145
export const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"]

export function abbreviateNumber(number?: number) {
    if (!number) {
        return number
    }

    // what tier? (determines SI symbol)
    const tier = (Math.log10(Math.abs(number)) / 3) | 0

    // if zero, we don't need a suffix
    if (tier === 0) return number

    // get suffix and determine scale
    const suffix = SI_SYMBOL[tier]
    const scale = 10 ** (tier * 3)

    // scale the number
    const scaled = number / scale

    // format number and add suffix
    //   return scaled.toFixed(1) + suffix;
    return (
        scaled.toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }) + suffix
    )
}

export function getTitleName(itemInfo: any, G: GData) {
    const titleKey = itemInfo.p as TitleName
    const titleName = titleKey && G.titles[titleKey] ? `${G.titles[titleKey].title}` : ""
    return titleName
}
