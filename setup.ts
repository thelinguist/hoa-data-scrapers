import * as fs from 'node:fs'
const file = "properties.csv"
import * as csvParser from 'papaparse'
import htmlParser from "node-html-parser"
import {fetchHTMLWithCache} from './util/fetch-with-cache'

const prefix = "https://www.utahcounty.gov/LandRecords/"
const govSerialUrl = `${prefix}AddressSearch.asp`

const TIMEOUT = 500
const outputFile = "output.csv"

const streetTypes = {
  Drive: "DR",
  Street: "ST",
  View: "VW",
  Way: "WY",
  Road: "RD",
}

type AddressesCSVJSON = { address: string }

const getStreetType = (street: string) => {
  const val = streetTypes[street]
  if (val) {
    return val
  }
  return "%25"
}

const getPropertyLink = async (xml: string) => {
  const doc = htmlParser(xml)
  const table = doc.querySelector("table")
  const [,dataRow] = table?.querySelectorAll("tr") ?? []
  const cells = dataRow.querySelectorAll("td")
  const link = cells[0]?.querySelector("a")?.getAttribute("href")
  return prefix + link
}

const getDetails = async (link: string, address: string) => {
  const xml = await fetchHTMLWithCache(link, `${address}-details`)
  const doc = htmlParser(xml)

  const mailingAddressElement = doc.querySelector('td:contains("Mailing Address")')

// Extract the text next to it
  const mailingAddress = mailingAddressElement?.textContent.split(":")[1].trim()


  return {
    mailingAddress,
  }
}

const getSearchResult = async (link: string, address: string) => {
  const xml = await fetchHTMLWithCache(link, `${address}-search`)
  const doc = htmlParser(xml)

  const table = doc.querySelector("table")
  const rows = table?.querySelectorAll("tr") ?? []
  const cells = rows[2].querySelectorAll("td")
  const detailsLink = cells[0].querySelector("a")?.getAttribute("href")
  const owner = cells[5].textContent
  const ownerSince = cells[2].textContent
  const serial = cells[0].textContent
  return {
    owner,
    ownerSince,
    serial,
    detailsLink: detailsLink!,
  }
}

(async function main() {
  const text = fs.readFileSync(file)
  if (!fs.existsSync(outputFile)) {
    fs.writeFileSync(outputFile, ["address", "owner", "ownerSince", "serial", "link","mailingAddress"].join(",") + "\n")
  }
  const csv = csvParser.parse(text.toString(), {header: true})
  const properties = {}
  for (const row of csv.data) {
    const {address} = row as AddressesCSVJSON
     // go to gov website and get the data
    const [av_house,av_street,street_type] = address.split(' ')
    const url = `${govSerialUrl}?av_house=${av_house}&av_dir=%25&av_street=${av_street}&street_type=${getStreetType(street_type)}&av_location=LEHI&av_valid=...&Submit=++++Search++++`
    const xml = await fetchHTMLWithCache(url, address)
    const link = await getPropertyLink(xml)
    // go to the property link and get the owner and renter
    const record = await getSearchResult(link, address)
    const { mailingAddress } = await getDetails(`${prefix}${record.detailsLink}`, address)
    properties[address] = {
      ...record,
      address,
      link,
      mailingAddress
    }
    fs.appendFileSync(outputFile, [address, '"' + record.owner + '"', record.ownerSince, record.serial, link, '"' + mailingAddress + '"'].join(",") + "\n")
  }
})()