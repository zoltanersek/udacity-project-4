
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        contract.getArilineName((error, result) => {
            let {0: mark, 1: registered, 2: name, 3: confirmations, 4: funded} = result;
            let select = DOM.elid('airlines');
            let option = DOM.option({value: contract.airlines[0]}, name)
            select.innerHTML = ''
            select.appendChild(option)
        })
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('buy').addEventListener('click', () => {
            let airline = DOM.elid('airlines').value
            let flight = DOM.elid('flight-numbers').value
            let value = DOM.elid('value').value
            contract.purchaseInsurance(airline, flight, value, (error, result) => {
                display('Insurance purchase', 'Purchased insurance',  [ { label: 'Insurance purchase status', error: error, value: result.flight + ' ' + result.passager + ' ' + result.value} ])
            })
        })
    
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







