const request = require('request'); //modul ktory bedzie wykonywal zapytania
var artist = 'BudkaSuflera'; //domyslna wartosc

if(process.argv[2]){
        artist = process.argv[2];   //nazwa zespolu
}

var replaced = artist.replace(/ /g, '+');    //usuwamy spacje z nazwy zespolu
var url = `https://api.discogs.com/database/search?q=${replaced}&type=artist&key=cPkcpBDMqvoeXINjbDvW&secret=lNXTbHkWuJtyJUQpdqGyGIHHlODZKLSm`;

function filterGroup(group){    //funkcja filtrujaca informacje o zespolach
        var filteredGroup = {id: group.id, name: group.name};   //zostaja tylko inf. o id zespolu i jego nazwie
        return filteredGroup;
}

function memberRequest(id, name){   //funkcja pobierajaca informacje o konkretnych czlonkach zespolu
        return new Promise(function (resolve, reject){
                    console.log(`Pobieram informacje nt. członka ${name}...`);
                    request({url: `https://api.discogs.com/artists/${id}`, headers: {'User-Agent':'test/0.1'}}, (err, res, body) => {
                        if(!err && res.statusCode == 200){
                                var arr = JSON.parse(body);
                                var groups = arr.groups;
                                var filteredGroups = groups.map(filterGroup);   //dla kazdego zespolu z tablicy groups wykonywana funkcja filterGroup
                                resolve(filteredGroups);
                        }
                        else{
                                reject(res.statusCode);
                        }
                })
        })
}

console.log('');
console.log('Wyszukuję id zespołu...');
request({url, headers: {'User-Agent':'test/0.1'}}, function(error,response,body){   //wyszukujemy id zespolu o podanej nazwie
        if(!error && response.statusCode == 200){
                if(JSON.parse(body).results.length == 0){
                        return console.log("Nie znaleziono zespolu, wpisz poprawna nazwe");
                }
                var groupID = JSON.parse(body).results[0].id;
                console.log('Pobieram informacje nt. zespołu...');
                request({url: `https://api.discogs.com/artists/${groupID}`, headers: {'User-Agent':'test/0.1'}}, async function(error,res,bod){ //zapytanie o dane zespolu o konkretnym id
                    if(!error && res.statusCode == 200){
                        var arr = JSON.parse(bod);
                        var members = arr.members;  //tablica z danymi o czlonkach zespolu
                        if(!members){
                            return console.log("Nie znaleziono zespolu")
                        }
                        var groupSet = new Set();   //zbior wszystkich zespolow do ktorych nalezeli czlonkowie
                        for(member of members){
                                try{
                                        var groups = await memberRequest(member.id, member.name);   //zapytanie o dane kazdego czlonka zespolu
                                        member.groups = groups.map((group) => { //w obiekcie kazdego czlonka zapisujemy id wszystkich zespolow w jakich gral
                                            return group.id;
                                        });
                                }catch(e){
                                        console.log(`${e}: Blad w trakcie memberRequest`);
                                        return e;
                                }
                                groups.forEach((group) => {
                                        if(!groupSet.has(JSON.stringify(group))){   //niestety w js porownywanie obiektow jest slabe (obiekty sa rowne sobie jesli maja ta sama referencje)
                                            groupSet.add(JSON.stringify(group));    //dlatego obiekty konwertujemy do JSON-owych stringow
                                        }
                                })
                        }

                        var groupArrJSON = Array.from(groupSet);    //nastepnie konwertujemy zbior zespolow z powrotem do tablicy js-owych obiektow
                        var groupArr = groupArrJSON.map((groupJSON) => {
                            return JSON.parse(groupJSON);
                        })

                        for(group of groupArr){ //zbior wszystkich zespolow
                            group.members = []; //dla kazdego zespolu tworzymy nowe pole, czyli tablice zawierajaca wystepujacych tam muzykow
                            for(member of members){
                                if(member.groups.includes(group.id)){   //jesli czlonek wystepowal w danym zespole,
                                    group.members.push(member);         //to jest wstawiany na liste czlonkow danego zespolu
                                }
                            }
                        }

                        console.log('');
                        console.log('Inne zespoły, w których grało przynajmniej dwóch członków wyszukiwanego zespołu:')
                        console.log('');
                        for(group of groupArr){
                            if(group.members.length > 1 && group.id != groupID){    //interesuja nas tylko grupy w ktorych przynajmniej 2 czlonkow wyszukiwanego zespolu gralo razem i odrzucamy zespol podany jako argument programu
                                console.log(`${group.name}:`);
                                for(member of group.members){
                                    console.log(member.name);
                                }
                                console.log('');
                            }
                        }
                    }
                    else{
                        console.log(`Błąd w trakcie wyszukiwania informacji nt. zespołu: ${error}`);
                        return error;
                    }
                });
        }
        else{
            console.log(`Błąd w trakcie wyszukiwania id zespołu: ${error}`);
            return error;
        }
});
