import * as fs from 'node:fs'
const file = "properties.csv"
import * as csvParser from 'papaparse'
import htmlParser from "node-html-parser"

const govSerialUrl = "https://www.utahcounty.gov/LandRecords/AddressSearch.asp"
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
  const [,dataRow] = table.querySelectorAll("tr")
  const cells = dataRow.querySelectorAll("td")
  const link = cells[0].querySelector("a").getAttribute("href")
  const prefix = "https://www.utahcounty.gov/LandRecords/"
  return prefix + link
}

const getDetails = async (link: string) => {
  const response = await fetch(link)
  const xml = await response.text()
  const doc = htmlParser(xml)

  const table = doc.querySelector("table")
  const rows = table.querySelectorAll("tr")
  const cells = rows[2].querySelectorAll("td")
  const owner = cells[5].textContent
  const ownerSince = cells[2].textContent
  const serial = cells[0].textContent
  return {
    owner,
    ownerSince,
    serial,
  }
}

export default async () => {
  const text = fs.readFileSync(file)
  if (!fs.existsSync(outputFile)) {
    fs.writeFileSync(outputFile, ["address", "owner", "ownerSince", "serial", "link"].join(",") + "\n")
  }
  const csv = csvParser.parse(text.toString(), {header: true})
  const properties = {}
  await Promise.all(csv.data.map(async (row: AddressesCSVJSON,i) => {
    await new Promise((resolve) => setTimeout(resolve, i * TIMEOUT))
    const {address} = row
     // go to gov website and get the data
    const [av_house,av_street,street_type] = address.split(' ')
    const url = `${govSerialUrl}?av_house=${av_house}&av_dir=%25&av_street=${av_street}&street_type=${getStreetType(street_type)}&av_location=LEHI&av_valid=...&Submit=++++Search++++`
    const response = await fetch(url)
    const xml = await response.text()
    const link = await getPropertyLink(xml)
    // go to the property link and get the owner and renter
    const record = await getDetails(link)
    properties[address] = {
      ...record,
      address,
      link,
    }
    fs.appendFileSync(outputFile, [address, '"' + record.owner + '"', record.ownerSince, record.serial, link].join(",") + "\n")
  }))
}