using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace FinansalVeriApp;

/// <summary>
/// Interaction logic for MainWindow.xaml
/// </summary>
public partial class MainWindow : Window
{
    public ObservableCollection<CorporateAccount> Accounts { get; set; }
    public ObservableCollection<CorporateAccount> FilteredAccounts { get; set; }

    public MainWindow()
    {
        InitializeComponent();
        Accounts = new ObservableCollection<CorporateAccount>();
        FilteredAccounts = new ObservableCollection<CorporateAccount>();

        // Örnek veri yükleme (10,000 hesap)
        for (int i = 1; i <= 10000; i++)
        {
            Accounts.Add(new CorporateAccount
            {
                AccountId = i,
                AccountName = $"Kurumsal Hesap {i}",
                ResponsibleTeam = $"Banka Ekip {i % 10 + 1}"
            });
        }

        FilteredAccounts = new ObservableCollection<CorporateAccount>(Accounts);
        DataContext = this;
    }

    private void FilterButton_Click(object sender, RoutedEventArgs e)
    {
        string filter = FilterTextBox.Text.ToLower();
        var filtered = Accounts.Where(a => a.AccountName.ToLower().Contains(filter) || a.ResponsibleTeam.ToLower().Contains(filter));
        FilteredAccounts.Clear();
        foreach (var account in filtered)
        {
            FilteredAccounts.Add(account);
        }
    }

    private void AddButton_Click(object sender, RoutedEventArgs e)
    {
        var newAccount = new CorporateAccount
        {
            AccountId = Accounts.Count + 1,
            AccountName = "Yeni Hesap",
            ResponsibleTeam = "Yeni Ekip"
        };
        Accounts.Add(newAccount);
        FilteredAccounts.Add(newAccount);
    }

    private void DeleteButton_Click(object sender, RoutedEventArgs e)
    {
        if (AccountsDataGrid.SelectedItem is CorporateAccount selected)
        {
            Accounts.Remove(selected);
            FilteredAccounts.Remove(selected);
        }
    }

    private void UpdateButton_Click(object sender, RoutedEventArgs e)
    {
        // Güncelleme için basit bir yaklaşım, seçili öğeyi düzenle
        if (AccountsDataGrid.SelectedItem is CorporateAccount selected)
        {
            selected.AccountName = "Güncellenmiş " + selected.AccountName;
        }
    }
}