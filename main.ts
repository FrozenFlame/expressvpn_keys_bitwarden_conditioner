import { parse, stringify } from "@std/csv";

// EXPRESSVPN HEADERS
// kind,name,username,url,password,login_note,totp,secure_note,card_name,card_type,card_number,security_code,zipcode,expiry,card_note

// BITWARDEN HEADERS
// folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp

interface CsvEntry {
    [key: string]: string,
}

async function main() {
    const bitwarden_header_file: string = await Deno.readTextFile("./in/bitwarden_headers.csv");
    const bitwarden_headers: string[] = ExtractHeaders(bitwarden_header_file);

    const expressvpn_file: string = await Deno.readTextFile("./in/expressvpn_data.csv");
    const evpn_headers: string[] = ExtractHeaders(expressvpn_file);
    const evpn_json: CsvEntry[] = PrepareJSON(evpn_headers, expressvpn_file) as CsvEntry[];

    const conditioned_json = ConditionToBitwarden(evpn_json);
    const csv_string: string = ConvertToBitwardenCSV(conditioned_json, bitwarden_headers);

    ExportCSV(csv_string);
}

function ExportCSV(csv_string: string) {
    const date_now = new Date();
    const year = date_now.getFullYear();
    const month = PadTime(date_now.getMonth());
    const day = PadTime(date_now.getDate()); 
    const hour = PadTime(date_now.getHours());
    const minute = PadTime(date_now.getMinutes());
    const second = PadTime(date_now.getSeconds());
    const timestamp = `${year}${month}${day}_${hour}${minute}${second}`;

    Deno.writeTextFileSync(`./out/evpn_${timestamp}.csv`, csv_string);
}

function PadTime(time: number) {
    return String(time).padStart(2, '0')
}

function PrepareJSON(headers: string[], rows: string): CsvEntry[] {
    if (!headers || !rows) return [];

    const parsed_rows = parse(rows, {
        columns: headers,
        skipFirstRow: true,
    });
    return parsed_rows;
}

function ConvertToBitwardenCSV(json_in: CsvEntry[], columns: string[]): string {
    if (!json_in) return "";
    return stringify(json_in, { columns });
}

function ExtractHeaders(input_string: string): string[] {
    if (!input_string || input_string.trim().length == 0) {
        return [];
    }
    const first_line_headers: string[] = input_string.split('\n')[0].split(',');

    return first_line_headers;
}

function ConditionToBitwarden(expressvpn_json: CsvEntry[]): CsvEntry[] {
    const conditioned_rows: CsvEntry[] = [];
    for (const row of expressvpn_json) {
        const conditioned_row = {
            folder: "",
            favorite: "",
            type: TranslateType(row.kind),
            name: row.name,
            notes: row.login_note || row.secure_note || row.card_note,
            fields: "",
            reprompt: "0",
            login_uri: row.url,
            login_username: row.username,
            login_password: row.password,
            login_totp: row.totp,
        };
        conditioned_rows.push(conditioned_row);
    }

    return conditioned_rows;
}

const expressvpn_types = {
    login: "login",
    secure_note: "note",
};

function TranslateType(expressvpn_kind: string): string {
    for (const [key, value] of Object.entries(expressvpn_types)) {
        if (key == expressvpn_kind) {
            return value;
        }
    }

    return expressvpn_kind;
}


if (import.meta.main) {
    console.log("Beginning conditioning...");
    await main();
    console.log("Done!");
}
